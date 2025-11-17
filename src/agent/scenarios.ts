/**
 * Programmatic Scenario Runner
 *
 * Pre-built demonstration scenarios that showcase key SkyFi MCP workflows.
 * These scenarios can be executed programmatically to demonstrate the agent's
 * capabilities or used as examples for building custom workflows.
 *
 * @packageDocumentation
 */

import { SkyFiAgent, createAgent, AgentResponse } from './agent.js';
import { logger } from '../lib/logger.js';

/**
 * Scenario configuration
 */
export interface ScenarioConfig {
  /** Scenario name */
  name: string;
  /** Scenario description */
  description: string;
  /** Estimated runtime in seconds */
  estimatedRuntime: number;
  /** Estimated cost in USD (approximate) */
  estimatedCost: number;
  /** Whether this scenario requires real API credentials */
  requiresLiveAPI: boolean;
}

/**
 * Scenario execution result
 */
export interface ScenarioResult {
  /** Scenario name */
  scenario: string;
  /** Success status */
  success: boolean;
  /** Total execution time in milliseconds */
  executionTime: number;
  /** Total tokens used */
  tokensUsed: number;
  /** Total cost in USD */
  cost: number;
  /** Number of interactions */
  interactions: number;
  /** Interaction history */
  history: Array<{
    user: string;
    assistant: string;
    toolCalls?: number;
  }>;
  /** Error message if failed */
  error?: string;
}

/**
 * Archive Search and Order Scenario
 *
 * Demonstrates searching for existing satellite imagery and placing an order.
 * This scenario walks through:
 * 1. Defining an area of interest
 * 2. Searching archive imagery
 * 3. Reviewing results
 * 4. Getting pricing information
 * 5. Configuring delivery
 * 6. Placing an order (simulated)
 *
 * @param agent - SkyFi agent instance
 * @param dryRun - If true, don't actually place orders (default: true)
 * @returns Scenario execution result
 */
export async function runSearchAndOrderScenario(
  agent: SkyFiAgent,
  dryRun = true,
): Promise<ScenarioResult> {
  const startTime = Date.now();
  const scenario = 'search-and-order';
  const history: ScenarioResult['history'] = [];

  logger.info('Starting search and order scenario', { dryRun });

  try {
    // Step 1: Search for imagery
    const searchMessage = `I need to search for satellite imagery of a wildfire area in Northern California.
The area is around Paradise, CA, defined by this polygon:
POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.70))

I need imagery from the past 7 days with the highest resolution available.`;

    logger.info('Step 1: Searching for archive imagery');
    const searchResponse = await agent.chat(searchMessage);
    history.push({
      user: searchMessage,
      assistant: searchResponse.message,
      toolCalls: searchResponse.toolCalls?.length,
    });

    // Step 2: Request details about first result
    const detailsMessage = 'Show me details about the first result. What\'s the cloud cover and resolution?';

    logger.info('Step 2: Reviewing imagery details');
    const detailsResponse = await agent.chat(detailsMessage);
    history.push({
      user: detailsMessage,
      assistant: detailsResponse.message,
      toolCalls: detailsResponse.toolCalls?.length,
    });

    // Step 3: Get pricing information
    const pricingMessage = 'What would this imagery cost?';

    logger.info('Step 3: Getting pricing information');
    const pricingResponse = await agent.chat(pricingMessage);
    history.push({
      user: pricingMessage,
      assistant: pricingResponse.message,
      toolCalls: pricingResponse.toolCalls?.length,
    });

    // Step 4: Configure delivery (but don't actually order unless not in dry run)
    let orderResponse: AgentResponse;
    if (dryRun) {
      const dryRunMessage = 'Thanks for the pricing info. This looks good but I\'ll place the order later.';

      logger.info('Step 4: Dry run - not placing order');
      orderResponse = await agent.chat(dryRunMessage);
      history.push({
        user: dryRunMessage,
        assistant: orderResponse.message,
        toolCalls: orderResponse.toolCalls?.length,
      });
    } else {
      const orderMessage = `I want to order this imagery and have it delivered to my S3 bucket.

Bucket: disaster-response-imagery
Region: us-west-2
Prefix: wildfire-assessment/paradise-2024/`;

      logger.warn('Placing real order - this will charge your account!');
      orderResponse = await agent.chat(orderMessage);
      history.push({
        user: orderMessage,
        assistant: orderResponse.message,
        toolCalls: orderResponse.toolCalls?.length,
      });
    }

    const stats = agent.getStats();
    const executionTime = Date.now() - startTime;

    logger.info('Search and order scenario completed', {
      executionTime,
      tokensUsed: stats.totalTokens,
      cost: stats.totalCost,
    });

    return {
      scenario,
      success: true,
      executionTime,
      tokensUsed: stats.totalTokens,
      cost: stats.totalCost,
      interactions: history.length,
      history,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Search and order scenario failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      scenario,
      success: false,
      executionTime,
      tokensUsed: 0,
      cost: 0,
      interactions: history.length,
      history,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Feasibility Check and Tasking Scenario
 *
 * Demonstrates checking if a satellite can capture new imagery and placing a tasking order.
 * This scenario walks through:
 * 1. Defining capture requirements
 * 2. Checking tasking feasibility
 * 3. Predicting satellite passes
 * 4. Getting pricing estimates
 * 5. Placing a tasking order (simulated)
 *
 * @param agent - SkyFi agent instance
 * @param dryRun - If true, don't actually place orders (default: true)
 * @returns Scenario execution result
 */
export async function runFeasibilityCheckScenario(
  agent: SkyFiAgent,
  dryRun = true,
): Promise<ScenarioResult> {
  const startTime = Date.now();
  const scenario = 'feasibility-check';
  const history: ScenarioResult['history'] = [];

  logger.info('Starting feasibility check scenario', { dryRun });

  try {
    // Step 1: Check feasibility
    const feasibilityMessage = `I'm monitoring a solar farm construction project in Arizona. I need to check if I can
order new satellite imagery of this location:
POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))

I need imagery captured sometime in the next 7 days at the highest resolution available.
Can you check if this is feasible?`;

    logger.info('Step 1: Checking tasking feasibility');
    const feasibilityResponse = await agent.chat(feasibilityMessage);
    history.push({
      user: feasibilityMessage,
      assistant: feasibilityResponse.message,
      toolCalls: feasibilityResponse.toolCalls?.length,
    });

    // Step 2: Request satellite pass predictions
    const passesMessage = 'Show me all satellite passes for the next 3 days';

    logger.info('Step 2: Predicting satellite passes');
    const passesResponse = await agent.chat(passesMessage);
    history.push({
      user: passesMessage,
      assistant: passesResponse.message,
      toolCalls: passesResponse.toolCalls?.length,
    });

    // Step 3: Get pricing
    const pricingMessage = 'What would it cost to order tasking imagery at 0.5m resolution for this area?';

    logger.info('Step 3: Getting tasking pricing');
    const pricingResponse = await agent.chat(pricingMessage);
    history.push({
      user: pricingMessage,
      assistant: pricingResponse.message,
      toolCalls: pricingResponse.toolCalls?.length,
    });

    // Step 4: Decide on order
    let orderResponse: AgentResponse;
    if (dryRun) {
      const dryRunMessage = 'Thanks for the information. Let me review with my team before placing the order.';

      logger.info('Step 4: Dry run - not placing tasking order');
      orderResponse = await agent.chat(dryRunMessage);
      history.push({
        user: dryRunMessage,
        assistant: orderResponse.message,
        toolCalls: orderResponse.toolCalls?.length,
      });
    } else {
      const orderMessage = `Yes, let's proceed with the standard delivery. I want the imagery delivered to
Google Cloud Storage.

Bucket: solar-farm-monitoring
Prefix: monthly-captures/november-2024/`;

      logger.warn('Placing real tasking order - this will charge your account!');
      orderResponse = await agent.chat(orderMessage);
      history.push({
        user: orderMessage,
        assistant: orderResponse.message,
        toolCalls: orderResponse.toolCalls?.length,
      });
    }

    const stats = agent.getStats();
    const executionTime = Date.now() - startTime;

    logger.info('Feasibility check scenario completed', {
      executionTime,
      tokensUsed: stats.totalTokens,
      cost: stats.totalCost,
    });

    return {
      scenario,
      success: true,
      executionTime,
      tokensUsed: stats.totalTokens,
      cost: stats.totalCost,
      interactions: history.length,
      history,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Feasibility check scenario failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      scenario,
      success: false,
      executionTime,
      tokensUsed: 0,
      cost: 0,
      interactions: history.length,
      history,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Monitoring Setup Scenario
 *
 * Demonstrates setting up automated monitoring notifications for new imagery.
 * This scenario walks through:
 * 1. Creating a monitoring notification
 * 2. Understanding notification payloads
 * 3. Setting up multiple monitoring areas
 * 4. Managing notification lifecycle
 *
 * @param agent - SkyFi agent instance
 * @returns Scenario execution result
 */
export async function runMonitoringSetupScenario(agent: SkyFiAgent): Promise<ScenarioResult> {
  const startTime = Date.now();
  const scenario = 'monitoring-setup';
  const history: ScenarioResult['history'] = [];

  logger.info('Starting monitoring setup scenario');

  try {
    // Step 1: Create notification
    const createMessage = `I need to set up monitoring for a coastal area in Southern California. I want to be
notified whenever new high-resolution satellite imagery becomes available.

Area: POLYGON((-118.65 34.00, -118.50 34.00, -118.50 34.05, -118.65 34.05, -118.65 34.00))

Requirements:
- Resolution: 5 meters or better
- Cloud cover: Less than 20%
- Product type: Optical imagery
- Notification webhook: https://api.coastal-monitoring.org/webhooks/skyfi-alerts`;

    logger.info('Step 1: Creating monitoring notification');
    const createResponse = await agent.chat(createMessage);
    history.push({
      user: createMessage,
      assistant: createResponse.message,
      toolCalls: createResponse.toolCalls?.length,
    });

    // Step 2: Request payload example
    const payloadMessage = 'Show me what the notification payload will look like';

    logger.info('Step 2: Understanding notification payloads');
    const payloadResponse = await agent.chat(payloadMessage);
    history.push({
      user: payloadMessage,
      assistant: payloadResponse.message,
      toolCalls: payloadResponse.toolCalls?.length,
    });

    // Step 3: List notifications
    const listMessage = 'Show me all my active monitoring notifications';

    logger.info('Step 3: Listing active notifications');
    const listResponse = await agent.chat(listMessage);
    history.push({
      user: listMessage,
      assistant: listResponse.message,
      toolCalls: listResponse.toolCalls?.length,
    });

    const stats = agent.getStats();
    const executionTime = Date.now() - startTime;

    logger.info('Monitoring setup scenario completed', {
      executionTime,
      tokensUsed: stats.totalTokens,
      cost: stats.totalCost,
    });

    return {
      scenario,
      success: true,
      executionTime,
      tokensUsed: stats.totalTokens,
      cost: stats.totalCost,
      interactions: history.length,
      history,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Monitoring setup scenario failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      scenario,
      success: false,
      executionTime,
      tokensUsed: 0,
      cost: 0,
      interactions: history.length,
      history,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cost Estimation Scenario
 *
 * Demonstrates exploring and comparing pricing for different imagery products.
 * This scenario walks through:
 * 1. Getting general pricing information
 * 2. Comparing different product types
 * 3. Analyzing cost optimization opportunities
 * 4. Creating budget projections
 *
 * @param agent - SkyFi agent instance
 * @returns Scenario execution result
 */
export async function runCostEstimationScenario(agent: SkyFiAgent): Promise<ScenarioResult> {
  const startTime = Date.now();
  const scenario = 'cost-estimation';
  const history: ScenarioResult['history'] = [];

  logger.info('Starting cost estimation scenario');

  try {
    // Step 1: Get pricing info
    const pricingMessage = `I'm planning a satellite imagery monitoring project and need to understand the
pricing for different types of imagery products. Can you explain the pricing
structure and show me the current rates?`;

    logger.info('Step 1: Getting general pricing information');
    const pricingResponse = await agent.chat(pricingMessage);
    history.push({
      user: pricingMessage,
      assistant: pricingResponse.message,
      toolCalls: pricingResponse.toolCalls?.length,
    });

    // Step 2: Request comparison
    const comparisonMessage = `I need to monitor 5 deforestation sites in the Amazon, each about 100 km². I need
monthly imagery for a year (12 captures per site). What would be the most
cost-effective approach?

My budget is $5,000/month. What resolution and approach can I afford?`;

    logger.info('Step 2: Comparing cost strategies');
    const comparisonResponse = await agent.chat(comparisonMessage);
    history.push({
      user: comparisonMessage,
      assistant: comparisonResponse.message,
      toolCalls: comparisonResponse.toolCalls?.length,
    });

    // Step 3: Explore alternatives
    const alternativeMessage = 'What if I use SAR imagery to deal with cloud cover? How would that change the costs?';

    logger.info('Step 3: Exploring alternative strategies');
    const alternativeResponse = await agent.chat(alternativeMessage);
    history.push({
      user: alternativeMessage,
      assistant: alternativeResponse.message,
      toolCalls: alternativeResponse.toolCalls?.length,
    });

    const stats = agent.getStats();
    const executionTime = Date.now() - startTime;

    logger.info('Cost estimation scenario completed', {
      executionTime,
      tokensUsed: stats.totalTokens,
      cost: stats.totalCost,
    });

    return {
      scenario,
      success: true,
      executionTime,
      tokensUsed: stats.totalTokens,
      cost: stats.totalCost,
      interactions: history.length,
      history,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Cost estimation scenario failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      scenario,
      success: false,
      executionTime,
      tokensUsed: 0,
      cost: 0,
      interactions: history.length,
      history,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Available scenarios
 */
export const AVAILABLE_SCENARIOS: Record<string, ScenarioConfig> = {
  'search-and-order': {
    name: 'Archive Search and Order',
    description: 'Search for existing satellite imagery and place an order',
    estimatedRuntime: 60,
    estimatedCost: 0.5,
    requiresLiveAPI: true,
  },
  'feasibility-check': {
    name: 'Feasibility Check and Tasking',
    description: 'Check if tasking is feasible and order new satellite capture',
    estimatedRuntime: 90,
    estimatedCost: 0.75,
    requiresLiveAPI: true,
  },
  'monitoring-setup': {
    name: 'Monitoring and Notification Setup',
    description: 'Set up automated monitoring notifications for new imagery',
    estimatedRuntime: 45,
    estimatedCost: 0.3,
    requiresLiveAPI: true,
  },
  'cost-estimation': {
    name: 'Cost Estimation and Pricing',
    description: 'Explore and compare pricing for different imagery products',
    estimatedRuntime: 60,
    estimatedCost: 0.4,
    requiresLiveAPI: false,
  },
};

/**
 * Run a scenario by name
 *
 * @param scenarioName - Name of the scenario to run
 * @param dryRun - If true, don't actually place orders (default: true)
 * @returns Scenario execution result
 */
export async function runScenario(
  scenarioName: string,
  dryRun = true,
): Promise<ScenarioResult> {
  const config = AVAILABLE_SCENARIOS[scenarioName];
  if (!config) {
    throw new Error(`Unknown scenario: ${scenarioName}`);
  }

  logger.info('Running scenario', {
    scenario: scenarioName,
    description: config.description,
    dryRun,
  });

  // Create a fresh agent for each scenario
  const agent = createAgent({ verbose: false });

  switch (scenarioName) {
    case 'search-and-order':
      return runSearchAndOrderScenario(agent, dryRun);
    case 'feasibility-check':
      return runFeasibilityCheckScenario(agent, dryRun);
    case 'monitoring-setup':
      return runMonitoringSetupScenario(agent);
    case 'cost-estimation':
      return runCostEstimationScenario(agent);
    default:
      throw new Error(`Unknown scenario: ${scenarioName}`);
  }
}

/**
 * Run all scenarios
 *
 * @param dryRun - If true, don't actually place orders (default: true)
 * @returns Results from all scenarios
 */
export async function runAllScenarios(dryRun = true): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];

  logger.info('Running all scenarios', { count: Object.keys(AVAILABLE_SCENARIOS).length });

  for (const scenarioName of Object.keys(AVAILABLE_SCENARIOS)) {
    try {
      const result = await runScenario(scenarioName, dryRun);
      results.push(result);
    } catch (error) {
      logger.error('Scenario execution failed', {
        scenario: scenarioName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      results.push({
        scenario: scenarioName,
        success: false,
        executionTime: 0,
        tokensUsed: 0,
        cost: 0,
        interactions: 0,
        history: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Print scenario results summary
 *
 * @param results - Scenario execution results
 */
export function printScenarioResults(results: ScenarioResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO EXECUTION SUMMARY');
  console.log('='.repeat(80) + '\n');

  for (const result of results) {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    const runtime = (result.executionTime / 1000).toFixed(2);

    console.log(`${status} - ${result.scenario}`);
    console.log(`  Runtime: ${runtime}s`);
    console.log(`  Tokens: ${result.tokensUsed.toLocaleString()}`);
    console.log(`  Cost: $${result.cost.toFixed(4)}`);
    console.log(`  Interactions: ${result.interactions}`);

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    console.log('');
  }

  const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0) / 1000;
  const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);
  const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
  const successCount = results.filter((r) => r.success).length;

  console.log('='.repeat(80));
  console.log('TOTALS:');
  console.log(`  Scenarios Run: ${results.length}`);
  console.log(`  Successful: ${successCount}/${results.length}`);
  console.log(`  Total Runtime: ${totalTime.toFixed(2)}s`);
  console.log(`  Total Tokens: ${totalTokens.toLocaleString()}`);
  console.log(`  Total Cost: $${totalCost.toFixed(4)}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * CLI entry point for running scenarios
 *
 * Usage:
 *   npm run scenarios                           # Run all scenarios (dry run)
 *   npm run scenarios search-and-order          # Run specific scenario (dry run)
 *   npm run scenarios search-and-order --live   # Run with live orders
 *   npm run scenarios --all                     # Run all scenarios
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const scenarioName = args[0];
  const isLive = args.includes('--live');
  const runAll = args.includes('--all') || !scenarioName;
  const dryRun = !isLive;

  if (dryRun) {
    console.log('⚠️  Running in DRY RUN mode - no real orders will be placed\n');
  } else {
    console.log('⚠️  Running in LIVE mode - real orders will be placed and charged!\n');
  }

  try {
    let results: ScenarioResult[];

    if (runAll) {
      results = await runAllScenarios(dryRun);
    } else {
      const result = await runScenario(scenarioName, dryRun);
      results = [result];
    }

    printScenarioResults(results);

    // Exit with error if any scenario failed
    const hasFailures = results.some((r) => !r.success);
    process.exit(hasFailures ? 1 : 0);
  } catch (error) {
    console.error('Fatal error running scenarios:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
