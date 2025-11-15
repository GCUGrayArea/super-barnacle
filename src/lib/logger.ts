/**
 * Winston logger configuration for SkyFi MCP
 *
 * This module provides a configured Winston logger instance with
 * structured JSON logging, correlation ID support, and proper log levels.
 */

import winston from 'winston';

import type { LogLevel, LogMetadata, LoggerConfig } from '../types/logging';

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: Required<LoggerConfig> = {
  level: (process.env['LOG_LEVEL'] as LogLevel) || 'info',
  json: process.env['NODE_ENV'] === 'production',
  colorize: process.env['NODE_ENV'] !== 'production',
  timestamp: true,
  defaultCorrelationId: '',
};

/**
 * Sensitive field names that should never be logged
 *
 * This list helps prevent accidental logging of API keys, passwords,
 * and other sensitive information.
 */
const SENSITIVE_FIELDS = [
  'apiKey',
  'api_key',
  'password',
  'secret',
  'token',
  'authorization',
  'auth',
  'credentials',
  'accessKey',
  'access_key',
  'secretKey',
  'secret_key',
  'privateKey',
  'private_key',
  'awsAccessKeyId',
  'awsSecretAccessKey',
  'azureStorageAccountKey',
  'azureStorageAccountName',
  'gcpServiceAccountKey',
];

/**
 * Sanitizes metadata to remove sensitive information
 *
 * This function recursively traverses the metadata object and masks
 * any fields that might contain sensitive data.
 *
 * @param metadata - Metadata object to sanitize
 * @returns Sanitized metadata object
 */
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of Object.entries(metadata)) {
    // Check if the key is sensitive
    const isSensitive = SENSITIVE_FIELDS.some(
      (field) => key.toLowerCase().includes(field.toLowerCase()),
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Sanitize arrays of objects
      sanitized[key] = value.map((item) => {
        if (item && typeof item === 'object') {
          return sanitizeMetadata(item as Record<string, unknown>);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return item;
      });
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Custom format for development logging with colorization
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({
    timestamp, level, message, ...metadata
  }) => {
    let msg = `${String(timestamp)} [${String(level)}]: ${String(message)}`;
    if (Object.keys(metadata).length > 0) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      msg += ` ${JSON.stringify(sanitizeMetadata(metadata), null, 2)}`;
    }
    return msg;
  }),
);

/**
 * Custom format for production logging with JSON output
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format((logInfo) => {
    // Sanitize metadata before logging
    const {
      timestamp, level, message, ...metadata
    } = logInfo;
    return {
      timestamp,
      level,
      message,
      ...sanitizeMetadata(metadata),
    };
  })(),
);

/**
 * Creates a Winston logger instance with the specified configuration
 *
 * @param config - Logger configuration options
 * @returns Configured Winston logger instance
 */
function createLogger(config: LoggerConfig = {}): winston.Logger {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return winston.createLogger({
    level: finalConfig.level,
    format: finalConfig.json ? prodFormat : devFormat,
    transports: [
      new winston.transports.Console({
        handleExceptions: true,
      }),
    ],
    exitOnError: false,
  });
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Creates a child logger with additional context
 *
 * This function is useful for creating loggers with default metadata
 * that will be included in all log messages from that logger.
 *
 * @param metadata - Default metadata to include in all log messages
 * @returns Child logger instance
 *
 * @example
 * ```typescript
 * const requestLogger = createChildLogger({ correlationId: 'abc-123' });
 * requestLogger.info('Processing request');
 * // Logs: { message: 'Processing request', correlationId: 'abc-123' }
 * ```
 */
export function createChildLogger(metadata: LogMetadata): winston.Logger {
  return logger.child(sanitizeMetadata(metadata));
}

/**
 * Logs a debug message
 *
 * @param message - Log message
 * @param metadata - Additional metadata
 */
export function debug(message: string, metadata?: LogMetadata): void {
  logger.debug(message, sanitizeMetadata(metadata || {}));
}

/**
 * Logs an info message
 *
 * @param message - Log message
 * @param metadata - Additional metadata
 */
export function info(message: string, metadata?: LogMetadata): void {
  logger.info(message, sanitizeMetadata(metadata || {}));
}

/**
 * Logs a warning message
 *
 * @param message - Log message
 * @param metadata - Additional metadata
 */
export function warn(message: string, metadata?: LogMetadata): void {
  logger.warn(message, sanitizeMetadata(metadata || {}));
}

/**
 * Logs an error message
 *
 * @param message - Log message
 * @param metadata - Additional metadata (including error details)
 */
export function error(message: string, metadata?: LogMetadata): void {
  logger.error(message, sanitizeMetadata(metadata || {}));
}

/**
 * Logs an error with full error object details
 *
 * This function extracts the error message, stack trace, and other
 * properties from an Error object and logs them appropriately.
 *
 * @param message - Log message
 * @param err - Error object
 * @param metadata - Additional metadata
 */
export function logError(message: string, err: Error, metadata?: LogMetadata): void {
  logger.error(message, {
    ...sanitizeMetadata(metadata || {}),
    errorMessage: err.message,
    errorName: err.name,
    stack: err.stack,
  });
}

/**
 * Creates a logger with correlation ID context
 *
 * This function creates a child logger that automatically includes
 * a correlation ID in all log messages for request tracing.
 *
 * @param correlationId - Correlation ID for request tracing
 * @returns Child logger with correlation ID context
 *
 * @example
 * ```typescript
 * const reqLogger = withCorrelationId('req-abc-123');
 * reqLogger.info('Starting request processing');
 * // Logs: { message: 'Starting request processing', correlationId: 'req-abc-123' }
 * ```
 */
export function withCorrelationId(correlationId: string): winston.Logger {
  return createChildLogger({ correlationId });
}

/**
 * Generates a unique correlation ID for request tracing
 *
 * This function generates a simple unique ID that can be used for
 * correlating log messages across service boundaries.
 *
 * @returns Unique correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Export the logger instance as default for convenience
// eslint-disable-next-line import/no-default-export
export default logger;
