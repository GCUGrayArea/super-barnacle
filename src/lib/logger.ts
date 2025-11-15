/**
 * Structured logging with Winston
 *
 * Provides centralized logging functionality for the SkyFi MCP server.
 * All logs are structured in JSON format for easy parsing and analysis.
 *
 * @packageDocumentation
 */

import winston from 'winston';

/**
 * Logger instance configured for structured logging
 *
 * Log levels: DEBUG, INFO, WARN, ERROR
 * Format: JSON with timestamp
 */
export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format:
        process.env['NODE_ENV'] === 'development'
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
            )
          : winston.format.json(),
    }),
  ],
});

/**
 * Create a child logger with additional context
 *
 * @param context - Additional context to include in all log messages
 * @returns Child logger with context
 *
 * @example
 * ```typescript
 * const reqLogger = createChildLogger({ correlationId: '123' });
 * reqLogger.info('Request processed');
 * ```
 */
export function createChildLogger(
  context: Record<string, unknown>,
): winston.Logger {
  return logger.child(context);
}
