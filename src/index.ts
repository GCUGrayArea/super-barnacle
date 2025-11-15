/**
 * SkyFi MCP Server - Main Entry Point
 *
 * This is the main entry point for the SkyFi Model Context Protocol server.
 * It initializes the MCP server, sets up HTTP/SSE transport, and registers
 * all available tools for satellite imagery ordering.
 *
 * @packageDocumentation
 */

import { config } from 'dotenv';

import { logger } from './lib/logger.js';
import { createMCPServer } from './mcp/server.js';
import type { MCPServer } from './mcp/server.js';

// Load environment variables
config();

let server: MCPServer | null = null;

/**
 * Main application entry point
 *
 * Initializes and starts the MCP server with configured settings.
 */
async function main(): Promise<void> {
  logger.info('SkyFi MCP Server - Starting...', {
    environment: process.env['NODE_ENV'] ?? 'development',
    nodeVersion: process.version,
  });

  try {
    // Initialize MCP server with configuration from environment
    server = createMCPServer({
      name: 'skyfi-mcp',
      version: '1.0.0',
      port: parseInt(process.env['PORT'] ?? '3000', 10),
    });

    // Tool registration will be added in Block 5 PRs
    // Example: server.registerTool('search_archives', toolDef, handler);

    // Start the server
    await server.start();

    logger.info('SkyFi MCP Server - Ready', {
      port: server.port,
      environment: process.env['NODE_ENV'] ?? 'development',
      registeredTools: server.getRegisteredTools().length,
    });
  } catch (error: unknown) {
    logger.error('Failed to start SkyFi MCP Server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 *
 * Ensures the server stops cleanly, closing all connections and cleaning
 * up resources before the process exits.
 *
 * @param signal - Signal that triggered shutdown
 */
async function handleShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully...`);

  if (server) {
    try {
      await server.stop(10000); // Wait max 10 seconds for graceful shutdown
      logger.info('Server stopped successfully');
      process.exit(0);
    } catch (error: unknown) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else {
    process.exit(0);
  }
}

// Start the application
main().catch((error: unknown) => {
  logger.error('Unhandled error in main', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  handleShutdown('SIGTERM').catch((error: unknown) => {
    logger.error('Error in SIGTERM handler', { error });
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  handleShutdown('SIGINT').catch((error: unknown) => {
    logger.error('Error in SIGINT handler', { error });
    process.exit(1);
  });
});
