# Agent Customization Guide

## Table of Contents

- [System Prompts](#system-prompts)
- [Tool Configuration](#tool-configuration)
- [Conversation Management](#conversation-management)
- [Custom Scenarios](#custom-scenarios)
- [Integration](#integration)
- [Advanced Features](#advanced-features)
- [Code Examples](#code-examples)

## System Prompts

### Modifying Agent Personality

The agent's personality, behavior, and expertise are defined by its system prompt. You can customize this to create domain-specific assistants.

#### Default System Prompt

Location: `src/agent/prompts.ts`

```typescript
export const SYSTEM_PROMPT = `You are a helpful AI assistant powered by the SkyFi satellite imagery platform through the Model Context Protocol (MCP).

**Your Capabilities:**
[Lists available tools and features]

**Your Behavior:**
- Be conversational, friendly, and helpful
- Ask clarifying questions when you need more information
- Explain technical concepts in simple terms
...
`;
```

#### Creating a Custom System Prompt

**Example 1: Agricultural Specialist**

```typescript
export const AGRICULTURE_SYSTEM_PROMPT = `You are an agricultural monitoring specialist powered by SkyFi satellite imagery platform.

**Your Expertise:**
You specialize in helping farmers and agricultural organizations monitor crop health, optimize irrigation, and maximize yields using satellite imagery.

**Your Capabilities:**
1. **Crop Health Assessment**: Analyze multispectral imagery to detect vegetation stress, disease, or pest damage
2. **Irrigation Optimization**: Identify areas needing water using NDVI and thermal imagery
3. **Yield Prediction**: Estimate crop yields based on vegetation indices and historical data
4. **Field Mapping**: Create accurate field boundaries and crop classification maps

**Your Behavior:**
- Use agricultural terminology familiar to farmers
- Focus on actionable insights for farm management
- Recommend specific satellite products for crop monitoring (Sentinel-2, Planet)
- Explain vegetation indices (NDVI, EVI, NDWI) in practical terms
- Always consider cost-effectiveness for farmers

**When helping users:**
- Ask about crop type, growth stage, and specific concerns
- Recommend appropriate imagery resolution (10m often sufficient for crops)
- Suggest monitoring frequency based on crop type and season
- Explain how cloud cover impacts optical imagery of fields
- Guide users to free Sentinel-2 data when possible to save costs

Remember: Farmers need practical, cost-effective solutions!`;
```

**Example 2: Disaster Response Expert**

```typescript
export const DISASTER_RESPONSE_PROMPT = `You are a disaster response satellite imagery specialist.

**Your Mission:**
Help emergency responders, relief organizations, and government agencies rapidly assess disaster damage and coordinate response efforts using satellite imagery.

**Your Priority:**
Speed and accuracy are critical. Lives may depend on quick access to damage assessments.

**Your Capabilities:**
1. **Rapid Damage Assessment**: Quickly identify affected areas using before/after imagery
2. **Infrastructure Evaluation**: Assess damage to roads, bridges, buildings, utilities
3. **Evacuation Planning**: Identify safe routes and accessible areas
4. **Resource Allocation**: Help prioritize response based on severity

**Your Behavior:**
- Prioritize high-resolution imagery for detailed damage assessment
- Use SAR imagery when clouds obscure optical imagery (critical during storms)
- Recommend rapid delivery options even if they cost more
- Focus on actionable intelligence for responders
- Be direct and concise - no time for lengthy explanations during emergencies

**Special Considerations:**
- Always check for SAR availability in disaster zones (clouds common during storms)
- Recommend tasking new imagery if archive shows pre-disaster conditions only
- Suggest very high resolution (0.3-0.5m) for infrastructure damage assessment
- Consider helicopter/drone imagery for extremely urgent situations
- Coordinate with relief organizations on delivery to their cloud storage

This is urgent, life-saving work. Prioritize speed and accuracy.`;
```

**Example 3: Compliance and Regulatory Monitoring**

```typescript
export const COMPLIANCE_MONITORING_PROMPT = `You are a regulatory compliance monitoring specialist using satellite imagery.

**Your Role:**
Help regulatory agencies, environmental organizations, and compliance officers monitor and verify compliance with environmental regulations, permits, and land use restrictions.

**Your Expertise:**
1. **Environmental Compliance**: Monitor mining, logging, construction for permit compliance
2. **Land Use Verification**: Detect unauthorized development or land use changes
3. **Evidence Collection**: Provide high-quality imagery suitable for legal proceedings
4. **Change Detection**: Identify violations through temporal analysis

**Your Behavior:**
- Emphasize documentation quality (metadata, timestamps, resolution)
- Recommend very high-resolution imagery for evidence (0.3-0.5m)
- Suggest regular monitoring intervals (monthly/quarterly)
- Focus on change detection workflows
- Ensure imagery meets legal/evidentiary standards

**Important Considerations:**
- Recommend imagery with precise geolocation and timestamps
- Suggest archiving all imagery for compliance records
- Emphasize metadata completeness for legal documentation
- Consider multi-temporal analysis for proving timeline of violations
- Recommend ground truth validation for legal cases

**Tool Usage:**
- Always get detailed metadata with get_archive_by_id
- Set up monitoring for continuous compliance verification
- Recommend tasking for scheduled compliance checks
- Document all imagery orders for audit trails

Evidence quality is paramount. Ensure all imagery meets legal standards.`;
```

#### How to Apply Custom System Prompts

**Method 1: Modify prompts.ts**

```typescript
// src/agent/prompts.ts
export const SYSTEM_PROMPT = AGRICULTURE_SYSTEM_PROMPT;
```

**Method 2: Programmatic Override**

```typescript
import { SkyFiAgent } from './src/agent/agent.js';
import { AGRICULTURE_SYSTEM_PROMPT } from './src/agent/prompts.js';
import { createConversation } from './src/agent/conversation.js';

const conversation = createConversation({
  systemPrompt: AGRICULTURE_SYSTEM_PROMPT
});

const agent = new SkyFiAgent({
  conversation
});
```

**Method 3: Dynamic Prompt**

```typescript
function createDomainPrompt(domain: string, focusArea: string): string {
  return `You are a ${domain} specialist focused on ${focusArea}.

Your expertise includes satellite imagery analysis for ${domain} applications.

When helping users:
- Focus on ${focusArea} use cases
- Recommend imagery products suitable for ${domain}
- Explain concepts in ${domain} terminology
- Prioritize cost-effectiveness for ${domain} organizations

Be professional, accurate, and helpful.`;
}

const prompt = createDomainPrompt('forestry', 'deforestation monitoring');

const agent = new SkyFiAgent({
  conversation: createConversation({ systemPrompt: prompt })
});
```

### Adding Domain-Specific Knowledge

Enhance the system prompt with domain-specific information:

```typescript
export const ENHANCED_PROMPT = `${SYSTEM_PROMPT}

**Domain-Specific Knowledge:**

**Resolution Guidelines for Common Use Cases:**
- Building inspection: 0.3-0.5m (see individual buildings)
- Road mapping: 1-3m (identify road width, lanes)
- Crop monitoring: 10-30m (field-level analysis)
- Forest monitoring: 10-30m (forest boundaries, clear-cuts)
- Ship detection: 3-10m (identify vessels, ports)

**Best Satellites for Different Applications:**
- Very high-res urban: WorldView-3, Pleiades (0.3-0.5m)
- Daily monitoring: Planet SkySat (3m daily)
- Free/low-cost: Sentinel-2 (10m), Landsat 8 (30m)
- All-weather: Sentinel-1 SAR, ICEYE, Capella
- Multispectral agriculture: Sentinel-2, Landsat 8, Planet

**Cost Optimization Strategies:**
- Use Sentinel-2/Landsat for baseline monitoring (free data)
- Reserve high-resolution for change detection follow-up
- Combine optical and SAR for reliability in cloudy regions
- Set up monitoring instead of manual checks
- Order tasking for time-critical needs only

When users ask about applications, reference this knowledge to provide
informed recommendations.`;
```

### Changing Conversation Style

Customize how the agent communicates:

**Formal/Professional Style:**
```typescript
export const FORMAL_PROMPT = `${SYSTEM_PROMPT}

**Communication Style:**
- Use formal, professional language
- Address users as "you" or by title if provided
- Provide detailed explanations with technical accuracy
- Use bullet points and structured formatting
- Include relevant citations and references
- Minimize casual expressions or emojis`;
```

**Concise/Efficient Style:**
```typescript
export const CONCISE_PROMPT = `${SYSTEM_PROMPT}

**Communication Style:**
- Be brief and to-the-point
- Use short sentences and paragraphs
- Provide essential information only
- Ask targeted questions
- Use tables and lists for clarity
- Avoid lengthy explanations unless requested`;
```

**Educational/Tutorial Style:**
```typescript
export const EDUCATIONAL_PROMPT = `${SYSTEM_PROMPT}

**Communication Style:**
- Explain concepts thoroughly
- Provide context and background information
- Use analogies and examples
- Define technical terms
- Offer learning resources
- Encourage questions and exploration
- Guide users step-by-step through complex workflows`;
```

### Safety Guardrails

Add constraints to prevent unwanted actions:

```typescript
export const SAFE_PROMPT = `${SYSTEM_PROMPT}

**IMPORTANT SAFETY RULES:**

1. **Order Confirmation:**
   - ALWAYS confirm before placing ANY order
   - Show complete order summary with cost
   - Require explicit 'confirm' or 'yes' from user
   - Never assume user wants to proceed with orders

2. **Cost Warnings:**
   - Alert user for orders over $500
   - Double-confirm for orders over $1,000
   - Suggest alternatives for expensive orders
   - Always show cost estimates before ordering

3. **Data Privacy:**
   - Never request or store sensitive personal information
   - Don't ask for API keys or credentials in conversation
   - Remind users not to share credentials in chat

4. **Error Handling:**
   - If tool execution fails, explain the error clearly
   - Don't retry failed orders without user permission
   - Suggest troubleshooting steps before retrying

5. **Restricted Areas:**
   - Inform users about imagery restrictions
   - Don't place orders for obviously restricted areas
   - Suggest alternatives if area is restricted

FOLLOW THESE RULES STRICTLY. User trust is paramount.`;
```

## Tool Configuration

### Enabling/Disabling Specific Tools

Control which MCP tools the agent can use:

```typescript
import { createToolExecutor } from './src/agent/tool-executor.js';
import { SkyFiAgent } from './src/agent/agent.js';

// Read-only mode (no ordering)
const readOnlyExecutor = createToolExecutor({
  enabledTools: [
    'search_archives',
    'get_archive_by_id',
    'check_tasking_feasibility',
    'predict_satellite_passes',
    'get_pricing_info',
    'list_orders',
    'get_order_details',
    'list_notifications',
    // Disabled: order_archive_imagery, order_tasking_imagery
  ]
});

const agent = new SkyFiAgent({
  toolExecutor: readOnlyExecutor
});
```

**Common Tool Configurations:**

**Research/Exploration Mode:**
```typescript
const researchTools = [
  'search_archives',
  'get_archive_by_id',
  'check_tasking_feasibility',
  'predict_satellite_passes',
  'get_pricing_info',
];
```

**Ordering Mode:**
```typescript
const orderingTools = [
  'search_archives',
  'order_archive_imagery',
  'order_tasking_imagery',
  'get_order_details',
  'trigger_order_redelivery',
];
```

**Monitoring Mode:**
```typescript
const monitoringTools = [
  'create_monitoring_notification',
  'list_notifications',
  'delete_notification',
  'search_archives',
  'order_archive_imagery',
];
```

### Adding Custom Validation Rules

Wrap tools with custom validation:

```typescript
import { ToolExecutor } from './src/agent/tool-executor.js';

class ValidatingToolExecutor extends ToolExecutor {
  async executeTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    // Validate before execution
    if (toolName === 'order_archive_imagery') {
      await this.validateArchiveOrder(args);
    }

    if (toolName === 'order_tasking_imagery') {
      await this.validateTaskingOrder(args);
    }

    // Execute the tool
    return super.executeTool(toolName, args);
  }

  private async validateArchiveOrder(
    args: Record<string, unknown>
  ): Promise<void> {
    // Custom validation logic
    if (!args['deliveryConfig']) {
      throw new Error('Delivery configuration is required');
    }

    // Check budget limits
    const estimatedCost = await this.estimateOrderCost(args);
    if (estimatedCost > MAX_ORDER_COST) {
      throw new Error(
        `Order cost ($${estimatedCost}) exceeds maximum ($${MAX_ORDER_COST})`
      );
    }

    // Verify AOI is valid
    if (!this.isValidAOI(args['aoi'])) {
      throw new Error('Invalid area of interest format');
    }
  }

  private async validateTaskingOrder(
    args: Record<string, unknown>
  ): Promise<void> {
    // Check feasibility first
    const feasibility = await this.checkFeasibility(args);
    if (feasibility.score < 50) {
      throw new Error(
        `Tasking feasibility too low (${feasibility.score}/100). Consider different time window.`
      );
    }
  }
}

const agent = new SkyFiAgent({
  toolExecutor: new ValidatingToolExecutor()
});
```

### Creating Custom Tool Wrappers

Add logging, metrics, or modifications to tool behavior:

```typescript
class LoggingToolExecutor extends ToolExecutor {
  private toolCallCount: Map<string, number> = new Map();
  private toolCosts: Map<string, number> = new Map();

  async executeTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const startTime = Date.now();

    // Log tool call
    console.log(`[${new Date().toISOString()}] Executing: ${toolName}`);
    console.log(`Parameters:`, JSON.stringify(args, null, 2));

    // Track usage
    this.toolCallCount.set(
      toolName,
      (this.toolCallCount.get(toolName) || 0) + 1
    );

    try {
      // Execute tool
      const result = await super.executeTool(toolName, args);

      // Log success
      const duration = Date.now() - startTime;
      console.log(
        `[${new Date().toISOString()}] Success: ${toolName} (${duration}ms)`
      );

      return result;

    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      console.error(
        `[${new Date().toISOString()}] Error: ${toolName} (${duration}ms)`,
        error
      );
      throw error;
    }
  }

  getToolStats(): Record<string, number> {
    return Object.fromEntries(this.toolCallCount);
  }
}
```

### Tool Result Formatting

Customize how tool results are presented:

```typescript
import { formatToolResult } from './src/agent/prompts.js';

export function customFormatToolResult(
  toolName: string,
  result: unknown
): string {
  // Custom formatting for specific tools
  if (toolName === 'search_archives') {
    return formatSearchResults(result);
  }

  if (toolName === 'get_pricing_info') {
    return formatPricingInfo(result);
  }

  // Default formatting
  return formatToolResult(toolName, result);
}

function formatSearchResults(result: any): string {
  if (!result.results || result.results.length === 0) {
    return 'No archive imagery found matching your criteria.';
  }

  let output = `Found ${result.totalResults} results:\n\n`;

  result.results.slice(0, 5).forEach((item: any, index: number) => {
    output += `${index + 1}. ${item.satellite}\n`;
    output += `   Resolution: ${item.resolution}m\n`;
    output += `   Cloud Cover: ${item.cloudCover}%\n`;
    output += `   Captured: ${new Date(item.captureDate).toLocaleDateString()}\n`;
    output += `   Estimated Cost: $${item.estimatedCost}\n\n`;
  });

  return output;
}

function formatPricingInfo(result: any): string {
  return `
Pricing Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Archive Imagery:
- Very High Resolution: $${result.archive.veryHigh.min}-${result.archive.veryHigh.max} per km²
- High Resolution: $${result.archive.high.min}-${result.archive.high.max} per km²
- Medium Resolution: $${result.archive.medium.min}-${result.archive.medium.max} per km²

Tasking Imagery:
- Very High Resolution: $${result.tasking.veryHigh.min}-${result.tasking.veryHigh.max} per km²
- High Resolution: $${result.tasking.high.min}-${result.tasking.high.max} per km²
- Medium Resolution: $${result.tasking.medium.min}-${result.tasking.medium.max} per km²

Note: Prices vary by account tier and volume. Contact sales for enterprise pricing.
`;
}
```

## Conversation Management

### Context Window Management

Handle long conversations efficiently:

```typescript
import { createConversation, ConversationConfig } from './src/agent/conversation.js';

const conversation = createConversation({
  maxMessages: 30,  // Keep only last 30 messages
  systemPrompt: SYSTEM_PROMPT,
});

// Manually prune conversation
conversation.pruneMessages(20);  // Keep only last 20
```

**Strategies for Long Conversations:**

1. **Rolling Window**: Keep fixed number of recent messages
2. **Summarization**: Periodically summarize and restart
3. **Important Messages Only**: Filter out less relevant messages
4. **Checkpoint and Reset**: Save state, then start fresh

**Example: Summarization Strategy**

```typescript
async function summarizeAndContinue(
  agent: SkyFiAgent,
  conversation: Conversation
): Promise<void> {
  // Ask agent to summarize conversation
  const summary = await agent.chat(
    'Please summarize our conversation so far, including any orders placed and key decisions made.'
  );

  // Create new conversation with summary as context
  const newConversation = createConversation({
    systemPrompt: `${SYSTEM_PROMPT}

**Previous Conversation Summary:**
${summary.message}

Continue helping the user from this point.`,
  });

  // Replace agent's conversation
  agent.setConversation(newConversation);
}
```

### Conversation History Pruning

Intelligent pruning based on message importance:

```typescript
import { ConversationMessage } from './src/agent/conversation.js';

function pruneConversation(
  messages: ConversationMessage[],
  maxMessages: number
): ConversationMessage[] {
  // Always keep system message
  const systemMessages = messages.filter(m => m.role === 'system');

  // Score other messages by importance
  const scoredMessages = messages
    .filter(m => m.role !== 'system')
    .map(msg => ({
      message: msg,
      score: calculateImportance(msg),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMessages - systemMessages.length)
    .map(sm => sm.message);

  return [...systemMessages, ...scoredMessages];
}

function calculateImportance(msg: ConversationMessage): number {
  let score = 0;

  // Tool calls are important
  if (msg.toolCalls && msg.toolCalls.length > 0) {
    score += 10;
  }

  // Orders are very important
  if (msg.content.includes('order_archive_imagery') ||
      msg.content.includes('order_tasking_imagery')) {
    score += 20;
  }

  // Recent messages are more important
  const age = Date.now() - new Date(msg.timestamp || 0).getTime();
  const ageHours = age / (1000 * 60 * 60);
  score += Math.max(0, 10 - ageHours);

  // User messages slightly more important than assistant
  if (msg.role === 'user') {
    score += 2;
  }

  return score;
}
```

### Session Persistence

Save and restore conversations:

```typescript
import fs from 'fs/promises';

// Save conversation
async function saveConversation(
  conversation: Conversation,
  filename: string
): Promise<void> {
  const data = {
    metadata: conversation.getMetadata(),
    messages: conversation.getMessages(),
    timestamp: new Date().toISOString(),
  };

  await fs.writeFile(
    filename,
    JSON.stringify(data, null, 2),
    'utf-8'
  );
}

// Load conversation
async function loadConversation(filename: string): Promise<Conversation> {
  const data = JSON.parse(
    await fs.readFile(filename, 'utf-8')
  );

  const conversation = createConversation({
    systemPrompt: data.messages[0]?.content || SYSTEM_PROMPT,
  });

  // Restore messages
  data.messages.slice(1).forEach((msg: ConversationMessage) => {
    if (msg.role === 'user') {
      conversation.addUserMessage(msg.content);
    } else if (msg.role === 'assistant') {
      conversation.addAssistantMessage(msg.content);
    }
  });

  return conversation;
}

// Usage
await saveConversation(conversation, './conversations/session-123.json');

const restoredConversation = await loadConversation(
  './conversations/session-123.json'
);
```

### Multi-Turn Conversation Strategies

Design effective multi-turn interactions:

**Strategy 1: Confirmation Flow**

```typescript
class ConfirmationFlow {
  private pendingAction: any = null;

  async handleMessage(
    agent: SkyFiAgent,
    message: string
  ): Promise<AgentResponse> {
    // Check if this is a confirmation response
    if (this.pendingAction && this.isConfirmation(message)) {
      return await this.executePendingAction(agent);
    }

    if (this.pendingAction && this.isCancellation(message)) {
      this.pendingAction = null;
      return this.createResponse('Action cancelled.');
    }

    // Normal processing
    const response = await agent.chat(message);

    // Check if response requires confirmation
    if (this.requiresConfirmation(response)) {
      this.pendingAction = this.extractAction(response);
      return this.createConfirmationPrompt(this.pendingAction);
    }

    return response;
  }

  private isConfirmation(message: string): boolean {
    const confirmWords = ['confirm', 'yes', 'proceed', 'go ahead'];
    return confirmWords.some(word =>
      message.toLowerCase().includes(word)
    );
  }

  private requiresConfirmation(response: AgentResponse): boolean {
    return response.message.toLowerCase().includes('confirm');
  }
}
```

**Strategy 2: Context Tracking**

```typescript
class ContextTracker {
  private context: Map<string, any> = new Map();

  async chatWithContext(
    agent: SkyFiAgent,
    message: string
  ): Promise<AgentResponse> {
    // Inject context into message
    const enhancedMessage = this.injectContext(message);

    // Get response
    const response = await agent.chat(enhancedMessage);

    // Extract and store context from response
    this.extractContext(response);

    return response;
  }

  private injectContext(message: string): string {
    const context = Array.from(this.context.entries())
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    if (context) {
      return `${message}\n\nContext: ${context}`;
    }

    return message;
  }

  private extractContext(response: AgentResponse): void {
    // Extract order IDs
    const orderIdMatch = response.message.match(/ord_[a-zA-Z0-9]+/);
    if (orderIdMatch) {
      this.context.set('lastOrderId', orderIdMatch[0]);
    }

    // Extract archive IDs
    const archiveIdMatch = response.message.match(/arch_[a-zA-Z0-9]+/);
    if (archiveIdMatch) {
      this.context.set('lastArchiveId', archiveIdMatch[0]);
    }

    // Extract locations
    // ... more context extraction logic
  }
}
```

## Custom Scenarios

### Creating New Scenario Scripts

Build reusable workflow scripts:

```typescript
// src/agent/scenarios/custom-scenario.ts

import { SkyFiAgent, AgentResponse } from '../agent.js';
import { logger } from '../../lib/logger.js';

export interface ScenarioResult {
  success: boolean;
  results: AgentResponse[];
  totalTokens: number;
  totalCost: number;
  executionTime: number;
  error?: string;
  summary?: string;
}

export async function runWeeklyMonitoringScenario(
  agent: SkyFiAgent,
  sites: Array<{ name: string; aoi: string }>,
  dryRun = true
): Promise<ScenarioResult> {
  const startTime = Date.now();
  const results: AgentResponse[] = [];

  try {
    logger.info('Starting weekly monitoring scenario', {
      siteCount: sites.length,
      dryRun,
    });

    for (const site of sites) {
      console.log(`\n━━━ Monitoring: ${site.name} ━━━\n`);

      // Step 1: Search for new imagery
      const searchResult = await agent.chat(
        `Search for imagery of area ${site.aoi} from the past 7 days with resolution better than 10m and cloud cover less than 30%`
      );
      results.push(searchResult);

      if (!searchResult.success) {
        logger.warn('Search failed', { site: site.name });
        continue;
      }

      // Step 2: Check if good imagery was found
      const foundImagery = searchResult.message.toLowerCase().includes('found');

      if (!foundImagery) {
        console.log(`No new imagery for ${site.name}`);
        continue;
      }

      // Step 3: Get pricing for best result
      const pricingResult = await agent.chat(
        'What would the highest resolution result cost?'
      );
      results.push(pricingResult);

      // Step 4: Order if within budget (in live mode)
      if (!dryRun) {
        const orderResult = await agent.chat(
          `Order the best quality imagery with delivery to S3 bucket: weekly-monitoring-${site.name.toLowerCase()}`
        );
        results.push(orderResult);
      }
    }

    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);

    return {
      success: true,
      results,
      totalTokens,
      totalCost,
      executionTime: Date.now() - startTime,
      summary: `Processed ${sites.length} sites, ${results.length} operations`,
    };

  } catch (error) {
    logger.error('Scenario failed', { error });
    return {
      success: false,
      results,
      totalTokens: results.reduce((sum, r) => sum + r.tokensUsed, 0),
      totalCost: results.reduce((sum, r) => sum + r.cost, 0),
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Defining Conversation Flows

Create structured conversation patterns:

```typescript
type ConversationStep = {
  userMessage: string;
  expectedTools?: string[];
  validation?: (response: AgentResponse) => boolean;
  onSuccess?: (response: AgentResponse) => void;
  onError?: (response: AgentResponse) => void;
};

async function runConversationFlow(
  agent: SkyFiAgent,
  steps: ConversationStep[]
): Promise<ScenarioResult> {
  const results: AgentResponse[] = [];

  for (const [index, step] of steps.entries()) {
    console.log(`\nStep ${index + 1}/${steps.length}: ${step.userMessage.substring(0, 50)}...\n`);

    const response = await agent.chat(step.userMessage);
    results.push(response);

    // Validate response
    if (step.validation && !step.validation(response)) {
      console.error(`Step ${index + 1} validation failed`);
      step.onError?.(response);
      break;
    }

    // Check expected tools were called
    if (step.expectedTools) {
      const toolsUsed = response.toolCalls?.map(tc => tc.name) || [];
      const allToolsUsed = step.expectedTools.every(tool =>
        toolsUsed.includes(tool)
      );

      if (!allToolsUsed) {
        console.warn(`Expected tools not all used:`, {
          expected: step.expectedTools,
          actual: toolsUsed,
        });
      }
    }

    step.onSuccess?.(response);
  }

  return {
    success: true,
    results,
    totalTokens: results.reduce((sum, r) => sum + r.tokensUsed, 0),
    totalCost: results.reduce((sum, r) => sum + r.cost, 0),
    executionTime: 0,
  };
}

// Example usage
const archiveOrderFlow: ConversationStep[] = [
  {
    userMessage: 'Search for imagery of Manhattan from last week',
    expectedTools: ['search_archives'],
    validation: (r) => r.success && r.message.includes('found'),
  },
  {
    userMessage: 'Show me details about the highest resolution result',
    expectedTools: ['get_archive_by_id'],
  },
  {
    userMessage: 'What would this cost?',
    expectedTools: ['get_pricing_info'],
  },
  {
    userMessage: 'Order it with delivery to S3 bucket: my-imagery',
    expectedTools: ['order_archive_imagery'],
    onSuccess: (r) => {
      const orderIdMatch = r.message.match(/ord_[a-zA-Z0-9]+/);
      if (orderIdMatch) {
        console.log(`✅ Order placed: ${orderIdMatch[0]}`);
      }
    },
  },
];

await runConversationFlow(agent, archiveOrderFlow);
```

### Adding Custom Validation

Validate scenario outcomes:

```typescript
interface ValidationRule {
  name: string;
  check: (result: ScenarioResult) => boolean;
  message: string;
}

const scenarioValidations: ValidationRule[] = [
  {
    name: 'cost_limit',
    check: (result) => result.totalCost < 5.00,
    message: 'Scenario exceeded $5 cost limit',
  },
  {
    name: 'success_required',
    check: (result) => result.success === true,
    message: 'Scenario must complete successfully',
  },
  {
    name: 'minimum_results',
    check: (result) => result.results.length >= 3,
    message: 'Scenario must have at least 3 interactions',
  },
  {
    name: 'token_limit',
    check: (result) => result.totalTokens < 10000,
    message: 'Scenario exceeded 10k token limit',
  },
];

function validateScenario(
  result: ScenarioResult,
  rules: ValidationRule[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.check(result)) {
      errors.push(`${rule.name}: ${rule.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Usage
const result = await runMyScenario(agent);
const validation = validateScenario(result, scenarioValidations);

if (!validation.valid) {
  console.error('Scenario validation failed:');
  validation.errors.forEach(err => console.error(`  - ${err}`));
}
```

### Sharing Scenarios

Package scenarios for distribution:

```typescript
// scenarios/my-scenario-package.ts

export interface ScenarioConfig {
  name: string;
  description: string;
  estimatedCost: number;
  estimatedTime: number;
  parameters?: Record<string, any>;
}

export const scenarios: Record<string, ScenarioConfig> = {
  'weekly-monitoring': {
    name: 'Weekly Site Monitoring',
    description: 'Monitor multiple sites for new imagery weekly',
    estimatedCost: 2.50,
    estimatedTime: 120,
    parameters: {
      sites: 'Array of {name, aoi} objects',
      dryRun: 'boolean (default: true)',
    },
  },
  'disaster-response': {
    name: 'Disaster Response Workflow',
    description: 'Rapid damage assessment using satellite imagery',
    estimatedCost: 1.50,
    estimatedTime: 90,
  },
};

export async function runScenario(
  scenarioName: string,
  agent: SkyFiAgent,
  params?: Record<string, any>
): Promise<ScenarioResult> {
  switch (scenarioName) {
    case 'weekly-monitoring':
      return runWeeklyMonitoringScenario(agent, params?.sites || [], params?.dryRun);
    case 'disaster-response':
      return runDisasterResponseScenario(agent, params);
    default:
      throw new Error(`Unknown scenario: ${scenarioName}`);
  }
}
```

## Integration

### Using the Agent in Your Application

Integrate the demo agent into your application:

```typescript
// src/services/satellite-service.ts

import { SkyFiAgent } from '@skyfi/demo-agent';

export class SatelliteImageryService {
  private agent: SkyFiAgent;

  constructor() {
    this.agent = new SkyFiAgent({
      verbose: false,
      maxToolIterations: 5,
    });
  }

  async searchImagery(
    location: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    const response = await this.agent.chat(
      `Search for imagery of ${location} from ${startDate} to ${endDate}`
    );

    if (!response.success) {
      throw new Error(`Search failed: ${response.error}`);
    }

    return this.parseSearchResults(response);
  }

  async orderImagery(
    archiveId: string,
    deliveryConfig: any
  ): Promise<string> {
    const response = await this.agent.chat(
      `Order archive imagery ${archiveId} with delivery to ${JSON.stringify(deliveryConfig)}`
    );

    if (!response.success) {
      throw new Error(`Order failed: ${response.error}`);
    }

    return this.extractOrderId(response);
  }

  private parseSearchResults(response: AgentResponse): any {
    // Parse natural language response into structured data
    // This is simplified - you'd want more robust parsing
    return {
      results: [],
      // ... extract from response.message
    };
  }

  private extractOrderId(response: AgentResponse): string {
    const match = response.message.match(/ord_[a-zA-Z0-9]+/);
    if (!match) {
      throw new Error('Could not extract order ID from response');
    }
    return match[0];
  }
}
```

### API Mode (Programmatic Access)

Create a REST API wrapper:

```typescript
// src/api/agent-api.ts

import express from 'express';
import { SkyFiAgent } from './agent/agent.js';

const app = express();
app.use(express.json());

const agents = new Map<string, SkyFiAgent>();

// Create new conversation session
app.post('/api/sessions', (req, res) => {
  const sessionId = generateSessionId();
  const agent = new SkyFiAgent({
    verbose: false,
  });

  agents.set(sessionId, agent);

  res.json({
    sessionId,
    message: 'Session created successfully',
  });
});

// Send message to agent
app.post('/api/sessions/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  const agent = agents.get(sessionId);
  if (!agent) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    const response = await agent.chat(message);

    res.json({
      success: response.success,
      message: response.message,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
      toolCalls: response.toolCalls,
    });

  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get conversation stats
app.get('/api/sessions/:sessionId/stats', (req, res) => {
  const { sessionId } = req.params;
  const agent = agents.get(sessionId);

  if (!agent) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const stats = agent.getStats();
  res.json(stats);
});

// Delete session
app.delete('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  agents.delete(sessionId);

  res.json({ message: 'Session deleted' });
});

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

app.listen(3000, () => {
  console.log('Agent API listening on port 3000');
});
```

### Webhook Integration

Trigger agent on webhook events:

```typescript
// src/webhooks/skyfi-webhook-handler.ts

import express from 'express';
import { SkyFiAgent } from './agent/agent.js';

const app = express();
app.use(express.json());

const agent = new SkyFiAgent();

app.post('/webhooks/imagery-available', async (req, res) => {
  const payload = req.body;

  try {
    // Acknowledge immediately
    res.status(200).json({ status: 'received' });

    // Process in background
    processImageryNotification(payload);

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function processImageryNotification(payload: any): Promise<void> {
  const archiveId = payload.imagery.archiveId;
  const cloudCover = payload.imagery.cloudCover;
  const resolution = payload.imagery.resolution;

  // Use agent to analyze and decide
  const decision = await agent.chat(
    `New imagery is available: ${archiveId}, ${resolution}m resolution, ${cloudCover}% clouds. Should I order this imagery? Consider that our quality threshold is 10% clouds and 5m resolution.`
  );

  if (decision.message.toLowerCase().includes('yes') ||
      decision.message.toLowerCase().includes('order')) {
    // Place order
    await agent.chat(
      `Order imagery ${archiveId} with delivery to S3 bucket: automated-monitoring`
    );
  } else {
    console.log('Imagery did not meet criteria, skipping order');
  }
}

app.listen(5000, () => {
  console.log('Webhook handler listening on port 5000');
});
```

### Event Streaming

Stream agent responses in real-time:

```typescript
import { SkyFiAgent, AgentResponse } from './agent/agent.js';
import { EventEmitter } from 'events';

class StreamingAgent extends EventEmitter {
  private agent: SkyFiAgent;

  constructor() {
    super();
    this.agent = new SkyFiAgent();
  }

  async chatStreaming(message: string): Promise<void> {
    this.emit('start', { message });

    try {
      // Emit thinking event
      this.emit('thinking');

      const response = await this.agent.chat(message);

      // Emit tool calls as they happen
      if (response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          this.emit('toolCall', toolCall);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Stream response in chunks
      await this.streamResponse(response.message);

      this.emit('complete', {
        tokensUsed: response.tokensUsed,
        cost: response.cost,
      });

    } catch (error) {
      this.emit('error', error);
    }
  }

  private async streamResponse(text: string): Promise<void> {
    const words = text.split(' ');

    for (const word of words) {
      this.emit('chunk', word + ' ');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

// Usage
const streamingAgent = new StreamingAgent();

streamingAgent.on('start', ({ message }) => {
  console.log(`User: ${message}`);
});

streamingAgent.on('thinking', () => {
  process.stdout.write('Agent is thinking...\n');
});

streamingAgent.on('toolCall', (toolCall) => {
  console.log(`[Executing: ${toolCall.name}]`);
});

streamingAgent.on('chunk', (chunk) => {
  process.stdout.write(chunk);
});

streamingAgent.on('complete', ({ tokensUsed, cost }) => {
  console.log(`\n\nTokens: ${tokensUsed}, Cost: $${cost.toFixed(4)}`);
});

streamingAgent.on('error', (error) => {
  console.error('Error:', error);
});

await streamingAgent.chatStreaming('Search for imagery of Paris');
```

## Advanced Features

### Function Calling Customization

Modify how tools are called:

```typescript
import { ChatCompletionTool } from 'openai/resources/chat/completions.js';

function createCustomToolDefinition(
  toolName: string,
  description: string,
  parameters: any
): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: toolName,
      description,
      parameters: {
        type: 'object',
        properties: parameters,
        required: Object.keys(parameters),
      },
    },
  };
}

// Add custom constraints
const constrainedSearchTool = createCustomToolDefinition(
  'search_archives_constrained',
  'Search archives with built-in quality constraints',
  {
    aoi: {
      type: 'string',
      description: 'Area of interest in WKT format',
    },
    dateRange: {
      type: 'string',
      description: 'Date range in ISO format',
    },
    // Constrained parameter with enum
    quality: {
      type: 'string',
      enum: ['excellent', 'good', 'acceptable'],
      description: 'Quality level (excellent: <5% clouds, good: <15%, acceptable: <30%)',
    },
  }
);
```

### Temperature Tuning for Different Tasks

Optimize temperature for specific use cases:

```typescript
class AdaptiveTemperatureAgent {
  private agent: SkyFiAgent;
  private openaiClient: OpenAIClient;

  async chat(message: string): Promise<AgentResponse> {
    const taskType = this.classifyTask(message);
    const temperature = this.getTemperatureForTask(taskType);

    // Adjust temperature for this specific request
    this.openaiClient.setTemperature(temperature);

    return await this.agent.chat(message);
  }

  private classifyTask(message: string): TaskType {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
      return 'search';
    }

    if (lowerMessage.includes('order') || lowerMessage.includes('buy')) {
      return 'order';
    }

    if (lowerMessage.includes('explain') || lowerMessage.includes('how')) {
      return 'explanation';
    }

    if (lowerMessage.includes('compare') || lowerMessage.includes('which')) {
      return 'comparison';
    }

    return 'general';
  }

  private getTemperatureForTask(taskType: TaskType): number {
    const temperatures = {
      search: 0.2,       // Precise, factual
      order: 0.1,        // Very precise, no creativity
      explanation: 0.7,  // More natural language
      comparison: 0.5,   // Balanced
      general: 0.6,      // Default
    };

    return temperatures[taskType];
  }
}
```

### Token Usage Optimization

Reduce token consumption:

```typescript
class OptimizedAgent {
  private agent: SkyFiAgent;

  async chat(message: string): Promise<AgentResponse> {
    // Compress message
    const optimizedMessage = this.compressMessage(message);

    const response = await this.agent.chat(optimizedMessage);

    // Compress conversation history periodically
    if (this.shouldCompress()) {
      await this.compressHistory();
    }

    return response;
  }

  private compressMessage(message: string): string {
    // Remove unnecessary whitespace
    let compressed = message.replace(/\s+/g, ' ').trim();

    // Abbreviate common terms
    compressed = compressed
      .replace(/satellite imagery/gi, 'imagery')
      .replace(/resolution/gi, 'res')
      .replace(/cloud cover/gi, 'clouds');

    return compressed;
  }

  private shouldCompress(): boolean {
    const stats = this.agent.getStats();
    return stats.totalTokens > 50000;
  }

  private async compressHistory(): Promise<void> {
    // Summarize and restart conversation
    const summary = await this.agent.chat(
      'Briefly summarize our conversation in 2-3 sentences.'
    );

    // Create new conversation with summary
    // Implementation similar to previous examples
  }
}
```

### Parallel Tool Execution

Execute multiple tools simultaneously:

```typescript
async function parallelToolExecution(
  agent: SkyFiAgent,
  queries: string[]
): Promise<AgentResponse[]> {
  // Execute all queries in parallel
  const promises = queries.map(query => agent.chat(query));

  return await Promise.all(promises);
}

// Usage
const results = await parallelToolExecution(agent, [
  'Search for imagery of New York',
  'Search for imagery of London',
  'Search for imagery of Tokyo',
]);

console.log(`Completed ${results.length} searches in parallel`);
```

### Error Recovery Strategies

Implement automatic retry and recovery:

```typescript
class ResilientAgent {
  private agent: SkyFiAgent;
  private maxRetries = 3;

  async chatWithRetry(
    message: string,
    retryCount = 0
  ): Promise<AgentResponse> {
    try {
      const response = await this.agent.chat(message);

      if (!response.success && retryCount < this.maxRetries) {
        console.log(`Attempt ${retryCount + 1} failed, retrying...`);

        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry with modified message
        const retryMessage = this.createRetryMessage(message, response.error);
        return await this.chatWithRetry(retryMessage, retryCount + 1);
      }

      return response;

    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`Error occurred, retrying (${retryCount + 1}/${this.maxRetries})...`);

        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        return await this.chatWithRetry(message, retryCount + 1);
      }

      throw error;
    }
  }

  private createRetryMessage(
    originalMessage: string,
    error?: string
  ): string {
    if (error?.includes('rate limit')) {
      return `${originalMessage} (retry after rate limit)`;
    }

    if (error?.includes('timeout')) {
      return `${originalMessage} (retry after timeout)`;
    }

    return `${originalMessage} (retry)`;
  }
}
```

## Code Examples

### Complete Integration Example

Full example of integrated agent:

```typescript
// src/app.ts

import { SkyFiAgent } from './agent/agent.js';
import { SYSTEM_PROMPT } from './agent/prompts.js';
import { createConversation } from './agent/conversation.js';
import { logger } from './lib/logger.js';

class SatelliteImageryApp {
  private agent: SkyFiAgent;
  private sessionId: string;

  constructor(systemPrompt: string = SYSTEM_PROMPT) {
    this.sessionId = `session_${Date.now()}`;

    const conversation = createConversation({
      systemPrompt,
      maxMessages: 50,
    });

    this.agent = new SkyFiAgent({
      conversation,
      verbose: true,
      maxToolIterations: 5,
    });

    logger.info('Application initialized', {
      sessionId: this.sessionId,
    });
  }

  async processRequest(userMessage: string): Promise<any> {
    logger.info('Processing request', {
      sessionId: this.sessionId,
      messageLength: userMessage.length,
    });

    const response = await this.agent.chat(userMessage);

    logger.info('Request completed', {
      sessionId: this.sessionId,
      success: response.success,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
    });

    return {
      sessionId: this.sessionId,
      response: response.message,
      metadata: {
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        toolCalls: response.toolCalls?.map(tc => tc.name) || [],
      },
    };
  }

  getStats() {
    return {
      sessionId: this.sessionId,
      ...this.agent.getStats(),
    };
  }
}

// Usage
const app = new SatelliteImageryApp();

const result = await app.processRequest(
  'Search for imagery of San Francisco from last week'
);

console.log('Response:', result.response);
console.log('Metadata:', result.metadata);

const stats = app.getStats();
console.log('Session stats:', stats);
```

### Custom System Prompt Example

Domain-specific prompt:

```typescript
const REAL_ESTATE_PROMPT = `You are a real estate development satellite imagery specialist.

**Your Expertise:**
Help real estate developers, property managers, and urban planners analyze
properties and development sites using satellite imagery.

**Common Use Cases:**
- Site selection and feasibility analysis
- Property boundary verification
- Development progress monitoring
- Competitor analysis
- Market research (urban growth patterns)
- Due diligence for property acquisition

**Your Approach:**
1. Recommend very high-resolution imagery (0.3-0.5m) for property analysis
2. Suggest regular monitoring for development tracking
3. Provide cost-effective alternatives using medium-res for market research
4. Explain how imagery resolution affects property analysis accuracy
5. Guide users in selecting appropriate time periods for before/after analysis

**Communication Style:**
- Use real estate terminology
- Focus on ROI and business value
- Provide cost-benefit analysis
- Explain imagery quality impact on investment decisions

Help users make informed property decisions using satellite imagery!`;
```

### Custom Tool Wrapper Example

```typescript
class AuditedToolExecutor extends ToolExecutor {
  private auditLog: Array<{
    timestamp: Date;
    tool: string;
    args: any;
    result: any;
    user: string;
  }> = [];

  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    userId?: string
  ): Promise<unknown> {
    const startTime = Date.now();

    // Execute tool
    const result = await super.executeTool(toolName, args);

    // Audit log entry
    this.auditLog.push({
      timestamp: new Date(),
      tool: toolName,
      args,
      result,
      user: userId || 'anonymous',
    });

    // Alert on high-value operations
    if (toolName.includes('order') && this.estimateCost(args) > 1000) {
      await this.sendAlert({
        message: `High-value order placed: ${toolName}`,
        cost: this.estimateCost(args),
        user: userId,
      });
    }

    return result;
  }

  getAuditLog(): typeof this.auditLog {
    return [...this.auditLog];
  }

  exportAuditLog(filename: string): void {
    const fs = require('fs');
    fs.writeFileSync(
      filename,
      JSON.stringify(this.auditLog, null, 2)
    );
  }

  private estimateCost(args: any): number {
    // Estimate order cost from arguments
    return 0;  // Simplified
  }

  private async sendAlert(alert: any): Promise<void> {
    // Send alert via email, Slack, etc.
    console.log('ALERT:', alert);
  }
}
```

### Scenario Definition Example

```typescript
// scenarios/agricultural-monitoring.ts

export async function runAgriculturalMonitoringScenario(
  agent: SkyFiAgent,
  farmLocations: Array<{ name: string; aoi: string; cropType: string }>,
  dryRun = true
): Promise<ScenarioResult> {
  const results: AgentResponse[] = [];
  const startTime = Date.now();

  for (const farm of farmLocations) {
    console.log(`\n━━━ Monitoring ${farm.name} (${farm.cropType}) ━━━\n`);

    // Search for multispectral imagery
    const search = await agent.chat(
      `Search for multispectral imagery of farm area ${farm.aoi} from the past 14 days. I need to assess ${farm.cropType} crop health.`
    );
    results.push(search);

    if (!search.success) continue;

    // Analyze if good imagery was found
    if (!search.message.toLowerCase().includes('found')) {
      console.log(`No suitable imagery for ${farm.name}, checking tasking...`);

      // Check tasking feasibility
      const feasibility = await agent.chat(
        `Check if we can order new multispectral imagery tasking for area ${farm.aoi} in the next 7 days`
      );
      results.push(feasibility);
    } else {
      // Get pricing
      const pricing = await agent.chat(
        'What would the best multispectral imagery cost?'
      );
      results.push(pricing);

      // Order in live mode
      if (!dryRun) {
        const order = await agent.chat(
          `Order the imagery with delivery to S3 bucket: farm-monitoring-${farm.name}`
        );
        results.push(order);
      }
    }
  }

  return {
    success: true,
    results,
    totalTokens: results.reduce((sum, r) => sum + r.tokensUsed, 0),
    totalCost: results.reduce((sum, r) => sum + r.cost, 0),
    executionTime: Date.now() - startTime,
    summary: `Monitored ${farmLocations.length} farms`,
  };
}
```

### Integration Code Snippet

Express.js API integration:

```typescript
// routes/satellite.ts

import express from 'express';
import { SkyFiAgent } from '../agent/agent.js';

const router = express.Router();
const agent = new SkyFiAgent();

router.post('/search', async (req, res) => {
  const { location, startDate, endDate, resolution } = req.body;

  try {
    const response = await agent.chat(
      `Search for ${resolution} resolution imagery of ${location} from ${startDate} to ${endDate}`
    );

    if (!response.success) {
      return res.status(400).json({
        error: response.error,
        message: response.message,
      });
    }

    res.json({
      message: response.message,
      cost: response.cost,
      tokensUsed: response.tokensUsed,
    });

  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/order', async (req, res) => {
  const { archiveId, bucket, region } = req.body;

  try {
    const response = await agent.chat(
      `Order archive imagery ${archiveId} with delivery to S3 bucket ${bucket} in region ${region}`
    );

    if (!response.success) {
      return res.status(400).json({
        error: response.error,
      });
    }

    // Extract order ID
    const orderIdMatch = response.message.match(/ord_[a-zA-Z0-9]+/);

    res.json({
      orderId: orderIdMatch ? orderIdMatch[0] : null,
      message: response.message,
      cost: response.cost,
    });

  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

---

## Additional Resources

- [Demo Agent Guide](./demo-agent.md) - Main agent documentation
- [Demo Scenarios](./demo-scenarios.md) - Pre-built scenario walkthroughs
- [MCP Tools Reference](./mcp-tools-reference.md) - Tool documentation
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) - Function calling guide
- [SkyFi API Docs](https://docs.skyfi.com) - Official API documentation

## Contributing

We welcome contributions! To contribute custom prompts, tools, or scenarios:

1. Fork the repository
2. Create your feature in a branch
3. Add documentation and examples
4. Submit a pull request

## Support

- **GitHub Issues**: Report bugs or request features
- **Discussions**: Share customizations and get help
- **Documentation**: Check the docs for detailed guides

Happy customizing!
