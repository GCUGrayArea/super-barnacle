/**
 * Custom error classes for SkyFi MCP
 *
 * This module provides standardized error classes with proper inheritance
 * and contextual information for better error handling and debugging.
 */

/* eslint-disable max-classes-per-file */

/**
 * Base error class for SkyFi MCP errors
 *
 * All custom errors should extend this class to ensure consistent
 * error handling throughout the application.
 */
export class SkyFiError extends Error {
  /**
   * Error code for categorization and programmatic handling
   */
  public readonly code: string;

  /**
   * Additional context information about the error
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Creates a new SkyFiError
   *
   * @param message - Human-readable error message
   * @param code - Error code for categorization
   * @param context - Additional context information
   */
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'SkyFiError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when SkyFi API requests fail
 *
 * This error includes HTTP status codes and API-specific error codes
 * for detailed error handling.
 */
export class SkyFiAPIError extends SkyFiError {
  /**
   * HTTP status code from the API response
   */
  public readonly statusCode: number;

  /**
   * API-specific error code (if provided by SkyFi)
   */
  public readonly apiErrorCode?: string;

  /**
   * Creates a new SkyFiAPIError
   *
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code
   * @param apiErrorCode - API-specific error code (optional)
   * @param context - Additional context information
   */
  constructor(
    message: string,
    statusCode: number,
    apiErrorCode?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, 'SKYFI_API_ERROR', context);
    this.name = 'SkyFiAPIError';
    this.statusCode = statusCode;
    this.apiErrorCode = apiErrorCode;
  }
}

/**
 * Error thrown when input validation fails
 *
 * This error includes information about which field failed validation
 * and why, making it easier to provide actionable feedback to users.
 */
export class ValidationError extends SkyFiError {
  /**
   * Name of the field that failed validation
   */
  public readonly field?: string;

  /**
   * Validation errors for multiple fields
   */
  public readonly errors?: Array<{ field: string; message: string }>;

  /**
   * Creates a new ValidationError
   *
   * @param message - Human-readable error message
   * @param field - Field that failed validation (optional)
   * @param errors - Multiple validation errors (optional)
   * @param context - Additional context information
   */
  constructor(
    message: string,
    field?: string,
    errors?: Array<{ field: string; message: string }>,
    context?: Record<string, unknown>,
  ) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
    this.field = field;
    this.errors = errors;
  }
}

/**
 * Error thrown when authentication or authorization fails
 *
 * This error is used for API key validation, credential issues,
 * and permission-related failures.
 */
export class AuthenticationError extends SkyFiError {
  /**
   * Creates a new AuthenticationError
   *
   * @param message - Human-readable error message
   * @param context - Additional context information
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when a requested resource is not found
 *
 * This error is used when querying for orders, archives, or other
 * resources that don't exist.
 */
export class NotFoundError extends SkyFiError {
  /**
   * Type of resource that was not found
   */
  public readonly resourceType?: string;

  /**
   * ID of the resource that was not found
   */
  public readonly resourceId?: string;

  /**
   * Creates a new NotFoundError
   *
   * @param message - Human-readable error message
   * @param resourceType - Type of resource that was not found
   * @param resourceId - ID of the resource that was not found
   * @param context - Additional context information
   */
  constructor(
    message: string,
    resourceType?: string,
    resourceId?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, 'NOT_FOUND', context);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Error thrown when rate limiting is encountered
 *
 * This error includes information about when the client can retry
 * the request.
 */
export class RateLimitError extends SkyFiError {
  /**
   * Number of seconds to wait before retrying
   */
  public readonly retryAfter?: number;

  /**
   * Creates a new RateLimitError
   *
   * @param message - Human-readable error message
   * @param retryAfter - Seconds to wait before retrying
   * @param context - Additional context information
   */
  constructor(message: string, retryAfter?: number, context?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when a configuration issue is detected
 *
 * This error is used for missing environment variables, invalid
 * configuration values, and other setup issues.
 */
export class ConfigurationError extends SkyFiError {
  /**
   * Name of the configuration parameter that is invalid
   */
  public readonly parameter?: string;

  /**
   * Creates a new ConfigurationError
   *
   * @param message - Human-readable error message
   * @param parameter - Configuration parameter that is invalid
   * @param context - Additional context information
   */
  constructor(message: string, parameter?: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
    this.parameter = parameter;
  }
}

/**
 * Error thrown when an operation times out
 *
 * This error is used for network timeouts, long-running operations,
 * and other time-based failures.
 */
export class TimeoutError extends SkyFiError {
  /**
   * Timeout duration in milliseconds
   */
  public readonly timeoutMs?: number;

  /**
   * Creates a new TimeoutError
   *
   * @param message - Human-readable error message
   * @param timeoutMs - Timeout duration in milliseconds
   * @param context - Additional context information
   */
  constructor(message: string, timeoutMs?: number, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', context);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Type guard to check if an error is a SkyFiError
 *
 * @param error - Error to check
 * @returns True if error is a SkyFiError
 */
export function isSkyFiError(error: unknown): error is SkyFiError {
  return error instanceof SkyFiError;
}

/**
 * Type guard to check if an error is a SkyFiAPIError
 *
 * @param error - Error to check
 * @returns True if error is a SkyFiAPIError
 */
export function isSkyFiAPIError(error: unknown): error is SkyFiAPIError {
  return error instanceof SkyFiAPIError;
}

/**
 * Type guard to check if an error is a ValidationError
 *
 * @param error - Error to check
 * @returns True if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is an AuthenticationError
 *
 * @param error - Error to check
 * @returns True if error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if an error is a NotFoundError
 *
 * @param error - Error to check
 * @returns True if error is a NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Type guard to check if an error is a RateLimitError
 *
 * @param error - Error to check
 * @returns True if error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

/**
 * Type guard to check if an error is a ConfigurationError
 *
 * @param error - Error to check
 * @returns True if error is a ConfigurationError
 */
export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

/**
 * Type guard to check if an error is a TimeoutError
 *
 * @param error - Error to check
 * @returns True if error is a TimeoutError
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}
