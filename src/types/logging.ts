/**
 * Logging type definitions for SkyFi MCP
 *
 * This module provides TypeScript types for structured logging,
 * including log levels, contexts, and metadata.
 */

/**
 * Log levels supported by the application
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Context information for log entries
 *
 * This interface defines the structure for contextual information
 * that can be attached to log messages for better traceability.
 */
export interface LogContext {
  /**
   * Correlation ID for request tracing across service boundaries
   */
  correlationId?: string;

  /**
   * User ID or identifier (if applicable)
   */
  userId?: string;

  /**
   * Request ID for HTTP requests
   */
  requestId?: string;

  /**
   * Component or module name
   */
  component?: string;

  /**
   * Additional custom metadata
   */
  [key: string]: unknown;
}

/**
 * Metadata for log entries
 *
 * This interface defines additional metadata that can be attached
 * to log entries for enhanced debugging and monitoring.
 */
export interface LogMetadata extends LogContext {
  /**
   * Duration of an operation in milliseconds
   */
  durationMs?: number;

  /**
   * HTTP status code (if applicable)
   */
  statusCode?: number;

  /**
   * HTTP method (if applicable)
   */
  method?: string;

  /**
   * URL or endpoint (if applicable)
   */
  url?: string;

  /**
   * Error code (if applicable)
   */
  errorCode?: string;

  /**
   * Error message (if applicable)
   */
  errorMessage?: string;

  /**
   * Stack trace (if applicable)
   */
  stack?: string;
}

/**
 * Log entry structure
 *
 * This interface represents a complete log entry with all metadata.
 */
export interface LogEntry {
  /**
   * Log level
   */
  level: LogLevel;

  /**
   * Log message
   */
  message: string;

  /**
   * Timestamp (ISO 8601 format)
   */
  timestamp: string;

  /**
   * Log metadata
   */
  metadata?: LogMetadata;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /**
   * Minimum log level to output
   */
  level?: LogLevel;

  /**
   * Enable JSON format output
   */
  json?: boolean;

  /**
   * Enable colorized output (console only)
   */
  colorize?: boolean;

  /**
   * Enable timestamps
   */
  timestamp?: boolean;

  /**
   * Default correlation ID for all logs
   */
  defaultCorrelationId?: string;
}
