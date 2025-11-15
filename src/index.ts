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

// Load environment variables
config();

/**
 * Main application entry point
 */
function main(): void {
  // eslint-disable-next-line no-console
  console.log('SkyFi MCP Server - Starting...');
  // eslint-disable-next-line no-console
  console.log('Environment:', process.env['NODE_ENV'] ?? 'development');

  // TODO(PR-013): Initialize MCP server with HTTP/SSE transport
  // TODO(PR-013): Register all MCP tools
  // TODO(PR-013): Start listening on configured port

  // eslint-disable-next-line no-console
  console.log('SkyFi MCP Server - Ready (placeholder mode)');
}

// Start the application
try {
  main();
} catch (error) {
  console.error('Fatal error starting SkyFi MCP Server:', error);
  process.exit(1);
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  // eslint-disable-next-line no-console
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
