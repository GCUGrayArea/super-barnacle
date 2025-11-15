/**
 * SkyFi MCP Server - Main Entry Point
 *
 * This is the main entry point for the SkyFi Model Context Protocol server.
 * It will initialize the MCP server, set up HTTP/SSE transport, and register
 * all available tools for satellite imagery ordering.
 *
 * @packageDocumentation
 */

import { config } from 'dotenv';
import { logger } from './lib/logger.js';
import { loadMCPConfig } from './mcp/config.js';
import { SkyFiMCPServer } from './mcp/server.js';

// Load environment variables
config();

// Global server instance for graceful shutdown
let server: SkyFiMCPServer | null = null;

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  logger.info('SkyFi MCP Server - Starting...');
  logger.info('Environment', {
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    nodeVersion: process.version,
  });

  try {
    // Load configuration
    const mcpConfig = loadMCPConfig();

    // Create and start MCP server
    server = new SkyFiMCPServer(mcpConfig);
    await server.start();

    logger.info('SkyFi MCP Server - Ready', {
      port: mcpConfig.port,
      sseEndpoint: mcpConfig.sseEndpoint,
      messageEndpoint: mcpConfig.messageEndpoint,
      healthEndpoint: mcpConfig.healthEndpoint,
    });
  } catch (error) {
    logger.error('Failed to start SkyFi MCP Server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully...`);

  if (server) {
    try {
      await server.stop();
      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  } else {
    process.exit(0);
  }
}

// Start the application
main().catch((error) => {
  console.error('Fatal error starting SkyFi MCP Server:', error);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
