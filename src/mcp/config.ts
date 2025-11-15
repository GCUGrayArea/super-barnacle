/**
 * MCP Server Configuration
 *
 * This module provides configuration for the Model Context Protocol server.
 */

import { logger } from '../lib/logger.js';

/**
 * MCP Server configuration interface
 */
export interface MCPServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** HTTP port to listen on */
  port: number;
  /** Base path for SSE endpoint */
  sseEndpoint: string;
  /** Base path for message POST endpoint */
  messageEndpoint: string;
  /** Health check endpoint path */
  healthEndpoint: string;
  /** SkyFi API key */
  skyfiApiKey: string;
}

/**
 * Load MCP server configuration from environment variables
 */
export function loadMCPConfig(): MCPServerConfig {
  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  const skyfiApiKey = process.env['SKYFI_API_KEY'];

  if (!skyfiApiKey) {
    logger.error('SKYFI_API_KEY environment variable is required');
    throw new Error('SKYFI_API_KEY environment variable is required');
  }

  const config: MCPServerConfig = {
    name: 'skyfi-mcp',
    version: '1.0.0',
    port,
    sseEndpoint: '/sse',
    messageEndpoint: '/message',
    healthEndpoint: '/health',
    skyfiApiKey,
  };

  logger.info('MCP server configuration loaded', {
    name: config.name,
    version: config.version,
    port: config.port,
    sseEndpoint: config.sseEndpoint,
    messageEndpoint: config.messageEndpoint,
    healthEndpoint: config.healthEndpoint,
  });

  return config;
}
