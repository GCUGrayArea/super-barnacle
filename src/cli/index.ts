/**
 * SkyFi Demo Agent CLI
 *
 * Interactive command-line interface for the SkyFi demo agent.
 * Provides a REPL-style chat interface for users to interact with
 * the agent and access SkyFi satellite imagery capabilities.
 *
 * @packageDocumentation
 */

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { logger } from '../lib/logger.js';
import { createAgent, SkyFiAgent } from '../agent/agent.js';
import { WELCOME_MESSAGE, HELP_MESSAGE } from '../agent/prompts.js';

/**
 * CLI configuration
 */
interface CLIConfig {
  /** Enable verbose output */
  verbose?: boolean;
  /** Disable color output */
  noColor?: boolean;
}

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
};

/**
 * SkyFi Demo Agent CLI
 */
export class DemoAgentCLI {
  private agent: SkyFiAgent;
  private rl: readline.Interface;
  private config: Required<CLIConfig>;
  private running: boolean = false;

  /**
   * Create a CLI instance
   *
   * @param config - CLI configuration
   */
  constructor(config: CLIConfig = {}) {
    this.config = {
      verbose: config.verbose ?? false,
      noColor: config.noColor ?? false,
    };

    this.agent = createAgent({
      verbose: this.config.verbose,
    });

    this.rl = readline.createInterface({
      input,
      output,
      prompt: this.formatPrompt('> '),
    });

    // Handle CTRL+C
    this.rl.on('SIGINT', () => {
      this.handleExit();
    });
  }

  /**
   * Start the CLI
   */
  async start(): Promise<void> {
    this.running = true;

    // Display welcome message
    this.displayWelcome();

    // Main loop
    for await (const line of this.rl) {
      if (!this.running) {
        break;
      }

      const input = line.trim();

      // Skip empty lines
      if (!input) {
        this.rl.prompt();
        continue;
      }

      // Handle special commands
      if (await this.handleCommand(input)) {
        this.rl.prompt();
        continue;
      }

      // Process user message
      await this.processUserMessage(input);

      this.rl.prompt();
    }
  }

  /**
   * Display welcome message
   */
  private displayWelcome(): void {
    console.log('\n' + this.color(WELCOME_MESSAGE, 'CYAN'));
    console.log(this.color('\nType /help for available commands or /quit to exit.\n', 'DIM'));
    this.rl.prompt();
  }

  /**
   * Process a user message
   *
   * @param message - User message
   */
  private async processUserMessage(message: string): Promise<void> {
    console.log(); // Empty line for spacing

    try {
      // Show thinking indicator
      const thinkingInterval = this.showThinking();

      // Get response from agent
      const response = await this.agent.chat(message);

      // Clear thinking indicator
      clearInterval(thinkingInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line

      if (!response.success) {
        console.log(this.color('✗ Error: ' + (response.error ?? 'Unknown error'), 'RED'));
      }

      // Display assistant's response
      if (response.message) {
        console.log(this.color('Assistant:', 'BRIGHT'));
        console.log(response.message);
      }

      // Show token usage if verbose
      if (this.config.verbose) {
        console.log(
          this.color(
            `\n[Tokens: ${response.tokensUsed} | Cost: $${response.cost.toFixed(4)} | Tools: ${response.toolCalls?.length ?? 0}]`,
            'DIM',
          ),
        );
      }

      console.log(); // Empty line for spacing
    } catch (error) {
      console.log(
        this.color(
          '✗ An error occurred: ' + (error instanceof Error ? error.message : 'Unknown error'),
          'RED',
        ),
      );
      console.log();
    }
  }

  /**
   * Handle special commands
   *
   * @param input - User input
   * @returns True if command was handled, false otherwise
   */
  private async handleCommand(input: string): Promise<boolean> {
    const command = input.toLowerCase();

    // Help command
    if (command === '/help' || command === '/h') {
      console.log('\n' + HELP_MESSAGE);
      console.log(this.color('\n**CLI Commands:**', 'BRIGHT'));
      console.log('  /help, /h       - Show this help message');
      console.log('  /clear, /c      - Clear conversation history');
      console.log('  /stats, /s      - Show agent statistics');
      console.log('  /export, /e     - Export conversation to JSON');
      console.log('  /quit, /q       - Exit the CLI');
      console.log();
      return true;
    }

    // Clear conversation
    if (command === '/clear' || command === '/c') {
      this.agent.clearConversation();
      console.log(this.color('\n✓ Conversation history cleared.\n', 'GREEN'));
      return true;
    }

    // Show statistics
    if (command === '/stats' || command === '/s') {
      this.showStats();
      return true;
    }

    // Export conversation
    if (command === '/export' || command === '/e') {
      this.exportConversation();
      return true;
    }

    // Quit
    if (command === '/quit' || command === '/q' || command === '/exit') {
      this.handleExit();
      return true;
    }

    return false;
  }

  /**
   * Show agent statistics
   */
  private showStats(): void {
    const stats = this.agent.getStats();
    const metadata = this.agent.getConversationMetadata();

    console.log(this.color('\n📊 Agent Statistics:', 'BRIGHT'));
    console.log(`  Messages Processed: ${stats.messagesProcessed}`);
    console.log(`  Tool Calls Executed: ${stats.toolCallsExecuted}`);
    console.log(`  Total Tokens Used: ${stats.totalTokens.toLocaleString()}`);
    console.log(`  Total Cost: $${stats.totalCost.toFixed(4)}`);
    console.log(`  Average Response Time: ${Math.round(stats.averageResponseTime)}ms`);

    console.log(this.color('\n💬 Conversation Info:', 'BRIGHT'));
    console.log(`  Conversation ID: ${metadata.id}`);
    console.log(`  Started: ${metadata.startedAt.toLocaleString()}`);
    console.log(`  Last Interaction: ${metadata.lastInteractionAt.toLocaleString()}`);
    console.log(`  Message Count: ${metadata.messageCount}`);
    console.log();
  }

  /**
   * Export conversation to JSON file
   */
  private exportConversation(): void {
    const conversation = this.agent.exportConversation();
    const filename = `skyfi-conversation-${Date.now()}.json`;

    try {
      const fs = require('node:fs');
      fs.writeFileSync(filename, JSON.stringify(conversation, null, 2));
      console.log(this.color(`\n✓ Conversation exported to ${filename}\n`, 'GREEN'));
    } catch (error) {
      console.log(
        this.color(
          `\n✗ Failed to export conversation: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
          'RED',
        ),
      );
    }
  }

  /**
   * Handle exit
   */
  private handleExit(): void {
    this.running = false;

    const stats = this.agent.getStats();
    console.log(this.color('\n\n👋 Thanks for using SkyFi Demo Agent!', 'CYAN'));

    if (stats.messagesProcessed > 0) {
      console.log(
        this.color(
          `Session summary: ${stats.messagesProcessed} messages, ${stats.toolCallsExecuted} tool calls, $${stats.totalCost.toFixed(4)} total cost`,
          'DIM',
        ),
      );
    }

    console.log();
    this.rl.close();
    process.exit(0);
  }

  /**
   * Show thinking indicator
   *
   * @returns Interval ID
   */
  private showThinking(): NodeJS.Timeout {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    return setInterval(() => {
      process.stdout.write(
        '\r' + this.color(`${frames[i]} Thinking...`, 'YELLOW'),
      );
      i = (i + 1) % frames.length;
    }, 80);
  }

  /**
   * Format prompt with color
   *
   * @param text - Prompt text
   * @returns Formatted prompt
   */
  private formatPrompt(text: string): string {
    return this.color(text, 'BRIGHT');
  }

  /**
   * Apply color to text
   *
   * @param text - Text to color
   * @param color - Color name
   * @returns Colored text
   */
  private color(text: string, color: keyof typeof COLORS): string {
    if (this.config.noColor) {
      return text;
    }

    return COLORS[color] + text + COLORS.RESET;
  }
}

/**
 * Run the CLI
 *
 * @param config - CLI configuration
 */
export async function runCLI(config?: CLIConfig): Promise<void> {
  const cli = new DemoAgentCLI(config);
  await cli.start();
}

/**
 * Main entry point (if run directly)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const noColor = args.includes('--no-color');

  // Load environment variables
  await import('dotenv/config');

  // Run CLI
  runCLI({ verbose, noColor }).catch((error) => {
    logger.error('CLI error', { error: error.message });
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
