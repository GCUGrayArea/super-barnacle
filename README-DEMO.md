# SkyFi MCP Demo Agent

Welcome to the SkyFi MCP Demo Agent! This interactive AI agent demonstrates the power of the Model Context Protocol (MCP) for satellite imagery ordering and management through natural language conversations.

## Overview

The SkyFi Demo Agent is an AI-powered assistant that can help you:
- 🔍 Search for existing satellite imagery in SkyFi's archive
- 📦 Order archive imagery with delivery to cloud storage
- 🛰️ Check feasibility for new satellite captures (tasking)
- 📅 Predict satellite passes over specific locations
- 💰 Get pricing information and cost estimates
- 📊 Manage orders and track status
- 🔔 Set up monitoring notifications for new imagery
- 🤖 Execute pre-built demo scenarios

## Quick Start

### Prerequisites

Before running the demo agent, ensure you have:

1. **Node.js 18+** installed
2. **SkyFi API Key** from [skyfi.com/developers](https://www.skyfi.com/developers)
3. **OpenAI API Key** from [platform.openai.com](https://platform.openai.com)

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API keys:
   ```bash
   # Required for demo agent
   SKYFI_API_KEY=your_skyfi_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here

   # Optional: Configure other settings
   LOG_LEVEL=info
   NODE_ENV=development
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

### Running the Demo Agent

#### Interactive Mode (Coming Soon)

Start an interactive chat session with the agent:
```bash
npm run demo
```

This opens an interactive prompt where you can chat naturally with the agent:
```
Welcome to SkyFi Demo Agent! 🛰️

I can help you search, order, and manage satellite imagery.
Type 'help' for available commands or start chatting!

You: Search for imagery of San Francisco from the last week
Agent: I'll search for satellite imagery of San Francisco...
```

#### Pre-built Scenarios

Run pre-built demonstration scenarios that showcase key workflows:

```bash
# Run all scenarios (dry run - no real orders)
npm run scenarios

# Run a specific scenario (dry run)
npm run scenarios search-and-order
npm run scenarios feasibility-check
npm run scenarios monitoring-setup
npm run scenarios cost-estimation

# Run with live API calls (⚠️ WILL PLACE REAL ORDERS)
npm run scenarios search-and-order --live
```

## Available Scenarios

### 1. Archive Search and Order

**Scenario**: Search for existing satellite imagery and place an order
**File**: `examples/search-and-order.md`
**Runtime**: ~60 seconds
**Cost**: ~$0.50 in API calls (search and pricing only)

This scenario demonstrates:
- Searching archive imagery by location and date
- Reviewing imagery quality (resolution, cloud cover)
- Getting pricing estimates
- Configuring delivery to cloud storage
- Placing an order (dry run by default)

**Run it**:
```bash
npm run scenarios search-and-order
```

### 2. Feasibility Check and Tasking

**Scenario**: Check if new satellite capture is feasible and order tasking
**File**: `examples/feasibility-check.md`
**Runtime**: ~90 seconds
**Cost**: ~$0.75 in API calls

This scenario demonstrates:
- Checking tasking feasibility for a location
- Predicting satellite passes
- Understanding capture windows
- Getting tasking pricing
- Placing a tasking order (dry run by default)

**Run it**:
```bash
npm run scenarios feasibility-check
```

### 3. Monitoring and Notifications

**Scenario**: Set up automated monitoring for new imagery
**File**: `examples/monitoring-setup.md`
**Runtime**: ~45 seconds
**Cost**: ~$0.30 in API calls

This scenario demonstrates:
- Creating monitoring notifications
- Configuring webhook alerts
- Managing multiple monitoring areas
- Understanding notification payloads

**Run it**:
```bash
npm run scenarios monitoring-setup
```

### 4. Cost Estimation and Pricing

**Scenario**: Explore pricing and optimize costs for a monitoring project
**File**: `examples/cost-estimation.md`
**Runtime**: ~60 seconds
**Cost**: ~$0.40 in API calls

This scenario demonstrates:
- Getting comprehensive pricing information
- Comparing different imagery products
- Analyzing cost optimization strategies
- Creating budget projections

**Run it**:
```bash
npm run scenarios cost-estimation
```

## Cost Estimation

### Running the Demo Agent

**API Costs**:
- OpenAI API (GPT-4): ~$0.01-0.03 per message
- SkyFi API calls: Free for queries, only pay for actual orders

**Typical Costs**:
- Single conversation (5-10 messages): $0.10-0.30
- Running all scenarios (dry run): $2.00-3.00
- Interactive session (30 minutes): $0.50-1.50

**Important Notes**:
- Dry run mode (default) does NOT place real orders
- Searching and pricing are free - you only pay when ordering imagery
- The agent will always confirm before placing orders that charge your account
- Use `--live` flag only when you want to place real orders

### SkyFi Imagery Costs

When you actually order imagery (not in dry run mode):

**Archive Imagery** (existing imagery):
- Very High Resolution (0.3-1m): $5-10 per km²
- High Resolution (1-5m): $2-5 per km²
- Medium Resolution (5-30m): $0.50-2 per km²

**Tasking Imagery** (new captures):
- Very High Resolution (0.3-1m): $70-90 per km²
- High Resolution (1-5m): $30-50 per km²
- Medium Resolution (5-30m): $10-25 per km²

See `examples/cost-estimation.md` for detailed pricing breakdowns.

## Customization Options

### Agent Configuration

You can customize the agent's behavior by modifying the configuration in your code:

```typescript
import { createAgent } from './src/agent/agent.js';

const agent = createAgent({
  verbose: true,              // Enable detailed logging
  maxToolIterations: 5,       // Maximum tool call loops per message
  conversation: {
    maxMessages: 50,          // Maximum conversation history
    systemPrompt: '...',      // Custom system prompt
  }
});
```

### Creating Custom Scenarios

You can create your own scenarios by adding them to `src/agent/scenarios.ts`:

```typescript
export async function runMyCustomScenario(
  agent: SkyFiAgent,
  dryRun = true
): Promise<ScenarioResult> {
  // Your scenario implementation
  const response = await agent.chat('Your message here');
  // Process response...
}
```

### Extending the Agent

The agent uses the MCP tools from `src/mcp/tools/`. You can:
- Add new MCP tools
- Modify existing tool behavior
- Create custom tool executors
- Implement specialized workflows

## Common Use Cases

### Disaster Response

Search for recent imagery of affected areas:
```
Search for high-resolution imagery of [location] from the past 24 hours
```

### Infrastructure Monitoring

Set up monthly monitoring:
```
I need to monitor a construction site at [coordinates]. Set up notifications
for new imagery captured monthly with at least 1m resolution.
```

### Environmental Monitoring

Track changes over time:
```
Search for imagery of this forest area from 6 months ago and compare with
the most recent imagery available.
```

### Agricultural Monitoring

Monitor crop health:
```
Find multispectral imagery of my farm at [coordinates] from the past week
to assess crop health.
```

## Troubleshooting

### "API Key not found" Error

**Problem**: `SKYFI_API_KEY` or `OPENAI_API_KEY` not set

**Solution**:
1. Ensure `.env` file exists in project root
2. Verify API keys are correctly set (no quotes, no spaces)
3. Restart your terminal/shell after setting variables

### "No results found" in Scenarios

**Problem**: Search returns no archive imagery

**Solution**:
- The demo uses example locations that may not have recent imagery
- Try expanding the date range or changing the location
- Use the cost-estimation scenario instead (doesn't require real imagery)

### High OpenAI API Costs

**Problem**: OpenAI costs higher than expected

**Solution**:
- Use verbose mode (`verbose: false`) to reduce logging
- Limit conversation history (`maxMessages: 20`)
- Use shorter, more direct queries
- Consider using GPT-3.5 instead of GPT-4 (modify `src/agent/openai-client.ts`)

### Scenarios Failing

**Problem**: Scenarios timeout or fail unexpectedly

**Solution**:
1. Check your internet connection
2. Verify SkyFi API is accessible (check status page)
3. Increase timeout values in `src/agent/config.ts`
4. Run scenarios individually instead of all at once
5. Check logs in `logs/` directory for detailed error messages

### "Tool execution failed" Errors

**Problem**: MCP tools returning errors

**Solution**:
- Verify SkyFi API key is valid and active
- Check API rate limits (100 requests/minute default)
- Review tool parameters (AOI format, date ranges, etc.)
- Check detailed logs for specific error messages

## Limitations and Known Issues

### Current Limitations

1. **Interactive Mode**: Not yet implemented - use scenarios for now
2. **Order Confirmation**: In dry run mode, orders are simulated (not actually placed)
3. **Webhook Testing**: Notification scenarios don't actually send webhooks
4. **Rate Limiting**: No built-in rate limiting (may hit API limits with heavy use)
5. **Conversation Persistence**: Conversations are not saved between sessions

### Known Issues

1. **Long Conversations**: Token limits may cause issues with very long conversations
2. **Tool Timeouts**: Some tools (tasking feasibility) can take 10+ seconds
3. **Error Recovery**: Agent may not gracefully recover from certain API errors
4. **Cost Tracking**: Cost estimates are approximate, not exact

### Coming Soon

- ✅ Interactive CLI mode with readline interface
- ✅ Conversation history persistence (save/load)
- ✅ Better error handling and recovery
- ✅ Rate limiting and retry logic
- ✅ Web-based demo interface
- ✅ More sophisticated scenarios
- ✅ Integration tests with mock SkyFi API

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│                  (CLI / Scenarios / API)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      SkyFi Agent                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Conversation Manager                                  │ │
│  │  - Message history                                     │ │
│  │  - Context management                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  OpenAI Integration                                    │ │
│  │  - GPT-4 chat completions                             │ │
│  │  - Function calling                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Tool Executor                                         │ │
│  │  - MCP tool registry                                   │ │
│  │  - Tool execution & error handling                     │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tools Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Search     │  │  Feasibility │  │  Pricing     │      │
│  │   Archives   │  │    Check     │  │     Info     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Order     │  │    Order     │  │Notifications │      │
│  │   Archive    │  │   Tasking    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SkyFi API Client                          │
│  - HTTP client with retry logic                             │
│  - Request/response formatting                              │
│  - Error handling                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       SkyFi API                              │
│                  (api.skyfi.com)                             │
└─────────────────────────────────────────────────────────────┘
```

## Example Conversations

### Example 1: Simple Archive Search

```
You: Search for imagery of Central Park in New York from the last week

Agent: I'll search for recent satellite imagery of Central Park in New York.
[Executes: search_archives]

I found 5 results matching your criteria. Here are the top 3:

1. Captured: Nov 15, 2024 - Planet SkySat
   Resolution: 0.5m (very high)
   Cloud Cover: 8% (excellent)
   Cost: ~$450

2. Captured: Nov 13, 2024 - Sentinel-2
   Resolution: 10m (medium)
   Cloud Cover: 15%
   Cost: ~$80

3. Captured: Nov 11, 2024 - Landsat 8
   Resolution: 30m (low)
   Cloud Cover: 5%
   Cost: ~$25

Which would you like to order, or would you like more details?
```

### Example 2: Tasking with Feasibility Check

```
You: Can I order new satellite imagery of downtown Seattle to be captured
     tomorrow afternoon?

Agent: I'll check if we can schedule a satellite capture for downtown Seattle
tomorrow afternoon.
[Executes: check_tasking_feasibility]

Good news! Tasking is feasible for downtown Seattle tomorrow.

Feasibility Score: 85/100 (Excellent)
Available Satellites: WorldView-3, Pleiades-1B

Tomorrow's Passes:
- 2:30 PM UTC: WorldView-3 (Success rate: 92%)
- 3:15 PM UTC: Pleiades-1B (Success rate: 88%)

Weather: Clear skies expected (98% probability)

Would you like to proceed with ordering the capture? I can provide pricing
and delivery options.
```

### Example 3: Cost Comparison

```
You: Compare the cost of monitoring a 50 km² area monthly for a year using
     different resolutions

Agent: I'll calculate the annual cost for monitoring 50 km² monthly at
different resolutions.
[Executes: get_pricing_info]

Annual Cost Comparison (50 km², 12 months):

Very High Resolution (0.5m):
- Archive: $4,500 - $6,000/year
- Tasking: $42,000 - $54,000/year

High Resolution (3m):
- Archive: $1,200 - $3,000/year
- Tasking: $18,000 - $30,000/year

Medium Resolution (10m):
- Archive: $300 - $1,200/year
- Tasking: $6,000 - $15,000/year

Recommendation: For regular monitoring, start with medium resolution archive
imagery ($300-1,200/year) and use high resolution for specific events or
detailed analysis.

Would you like me to create a detailed monthly budget breakdown?
```

## Additional Resources

### Documentation

- [SkyFi API Documentation](https://docs.skyfi.com)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)

### Example Scenarios

All scenario documentation is in the `examples/` directory:
- `examples/search-and-order.md` - Detailed archive search walkthrough
- `examples/feasibility-check.md` - Tasking workflow guide
- `examples/monitoring-setup.md` - Notification setup guide
- `examples/cost-estimation.md` - Pricing exploration guide

### Related Projects

- [SkyFi Platform](https://www.skyfi.com) - Order satellite imagery
- [MCP Servers](https://github.com/modelcontextprotocol/servers) - Official MCP server examples
- [Claude Desktop](https://claude.ai/download) - Use this MCP server with Claude

## Support and Feedback

### Getting Help

1. **Documentation**: Check the scenario guides in `examples/`
2. **Logs**: Review logs in `logs/` directory for detailed error information
3. **GitHub Issues**: Report bugs or request features
4. **SkyFi Support**: Contact support@skyfi.com for API-related issues

### Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Feedback

We'd love to hear your feedback on the demo agent:
- What scenarios would you like to see?
- What features would be most useful?
- How can we improve the experience?

Open an issue or discussion on GitHub to share your thoughts!

## License

This project is licensed under the MIT License. See LICENSE file for details.

---

**Happy exploring!** 🛰️ 🚀

For more information about SkyFi's satellite imagery platform, visit [skyfi.com](https://www.skyfi.com).
