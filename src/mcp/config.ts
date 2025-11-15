/**
 * MCP Server Configuration
 *
 * This module provides configuration settings for the MCP server including
 * port, CORS, timeouts, and environment-based settings.
 */

/**
 * MCP Server configuration options
 */
export interface MCPServerConfig {
  /**
   * Server name identifier
   */
  name: string;

  /**
   * Server version
   */
  version: string;

  /**
   * Port to listen on
   * @default 3000
   */
  port: number;

  /**
   * CORS configuration
   */
  cors: {
    /**
     * Allowed origins for CORS requests
     * Use ['*'] to allow all origins (development only)
     */
    allowedOrigins: string[];

    /**
     * Allowed HTTP methods
     */
    allowedMethods: string[];

    /**
     * Allowed headers
     */
    allowedHeaders: string[];

    /**
     * Whether to allow credentials
     */
    credentials: boolean;
  };

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  requestTimeout: number;

  /**
   * Log level for MCP server
   * @default 'info'
   */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default MCP server configuration
 */
const DEFAULT_CONFIG: MCPServerConfig = {
  name: 'skyfi-mcp',
  version: '1.0.0',
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  cors: {
    allowedOrigins: process.env['NODE_ENV'] === 'production'
      ? (process.env['CORS_ALLOWED_ORIGINS']?.split(',') ?? [])
      : ['*'],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: process.env['NODE_ENV'] !== 'production',
  },
  requestTimeout: parseInt(process.env['REQUEST_TIMEOUT'] ?? '30000', 10),
  logLevel: (process.env['MCP_LOG_LEVEL']?.toLowerCase() as MCPServerConfig['logLevel']) ?? 'info',
};

/**
 * Creates MCP server configuration with defaults merged with provided options
 *
 * @param config - Partial configuration to override defaults
 * @returns Complete MCP server configuration
 *
 * @example
 * ```typescript
 * const config = createMCPConfig({
 *   port: 8080,
 *   logLevel: 'debug',
 * });
 * ```
 */
export function createMCPConfig(config?: Partial<MCPServerConfig>): MCPServerConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    cors: {
      ...DEFAULT_CONFIG.cors,
      ...(config?.cors ?? {}),
    },
  };
}

/**
 * Validates MCP server configuration
 *
 * @param config - Configuration to validate
 * @throws {Error} If configuration is invalid
 *
 * @example
 * ```typescript
 * validateMCPConfig(config);
 * ```
 */
export function validateMCPConfig(config: MCPServerConfig): void {
  if (!config.name || config.name.trim().length === 0) {
    throw new Error('MCP server name is required');
  }

  if (!config.version || config.version.trim().length === 0) {
    throw new Error('MCP server version is required');
  }

  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port number: ${config.port}. Must be between 1 and 65535`);
  }

  if (config.requestTimeout < 1000) {
    throw new Error(`Request timeout too short: ${config.requestTimeout}ms. Minimum is 1000ms`);
  }

  const validLogLevels: Array<MCPServerConfig['logLevel']> = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error(`Invalid log level: ${config.logLevel}. Must be one of: ${validLogLevels.join(', ')}`);
  }
}

/**
 * Gets the default MCP server configuration
 *
 * @returns Default MCP server configuration
 */
export function getDefaultConfig(): MCPServerConfig {
  return { ...DEFAULT_CONFIG };
}
