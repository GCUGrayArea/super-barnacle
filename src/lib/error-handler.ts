/**
 * Centralized error handling for SkyFi MCP
 *
 * This module provides standardized error handling functions that ensure
 * consistent error logging and response formatting throughout the application.
 */

import type { LogMetadata } from '../types/logging';

import {
  SkyFiAPIError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ConfigurationError,
  TimeoutError,
  isSkyFiError,
} from './errors';
import { logger, logError } from './logger';

/**
 * Normalized error response structure
 *
 * This interface defines the structure for error responses that are
 * returned to clients or logged for debugging.
 */
export interface ErrorResponse {
  /**
   * Error code for programmatic handling
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * HTTP status code (if applicable)
   */
  statusCode?: number;

  /**
   * Additional error details
   */
  details?: Record<string, unknown>;

  /**
   * Stack trace (only included in development mode)
   */
  stack?: string;
}

/**
 * Error handler options
 */
export interface ErrorHandlerOptions {
  /**
   * Include stack trace in error response
   */
  includeStack?: boolean;

  /**
   * Correlation ID for request tracing
   */
  correlationId?: string;

  /**
   * Additional context metadata
   */
  context?: LogMetadata;
}

/**
 * Converts an error to a normalized error response
 *
 * This function handles all error types and converts them to a consistent
 * response format, ensuring sensitive data is never exposed.
 *
 * @param error - Error to convert
 * @param options - Error handler options
 * @returns Normalized error response
 */
export function toErrorResponse(error: unknown, options: ErrorHandlerOptions = {}): ErrorResponse {
  const includeStack = options.includeStack ?? process.env['NODE_ENV'] !== 'production';

  // Handle SkyFi custom errors
  if (isSkyFiError(error)) {
    const response: ErrorResponse = {
      code: error.code,
      message: error.message,
    };

    // Add type-specific fields
    if (error instanceof SkyFiAPIError) {
      response.statusCode = error.statusCode;
      if (error.apiErrorCode) {
        response.details = { apiErrorCode: error.apiErrorCode };
      }
    } else if (error instanceof ValidationError) {
      if (error.field) {
        response.details = { field: error.field };
      }
      if (error.errors) {
        response.details = { ...response.details, errors: error.errors };
      }
    } else if (error instanceof NotFoundError) {
      response.statusCode = 404;
      if (error.resourceType || error.resourceId) {
        response.details = {
          resourceType: error.resourceType,
          resourceId: error.resourceId,
        };
      }
    } else if (error instanceof RateLimitError) {
      response.statusCode = 429;
      if (error.retryAfter) {
        response.details = { retryAfter: error.retryAfter };
      }
    } else if (error instanceof AuthenticationError) {
      response.statusCode = 401;
    } else if (error instanceof TimeoutError) {
      response.statusCode = 408;
      if (error.timeoutMs) {
        response.details = { timeoutMs: error.timeoutMs };
      }
    }

    if (includeStack && error.stack) {
      response.stack = error.stack;
    }

    return response;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const response: ErrorResponse = {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
    };

    if (includeStack && error.stack) {
      response.stack = error.stack;
    }

    return response;
  }

  // Handle unknown error types
  const errorString = String(error);
  return {
    code: 'UNKNOWN_ERROR',
    message: errorString === 'null' || errorString === 'undefined' ? 'An unknown error occurred' : errorString,
  };
}

/**
 * Handles an error by logging it and returning a normalized response
 *
 * This is the main error handling function that should be used throughout
 * the application. It ensures errors are properly logged with context and
 * converted to a consistent response format.
 *
 * @param error - Error to handle
 * @param options - Error handler options
 * @returns Normalized error response
 *
 * @example
 * ```typescript
 * try {
 *   await searchArchives(params);
 * } catch (error) {
 *   const errorResponse = handleError(error, {
 *     correlationId: 'req-123',
 *     context: { operation: 'searchArchives' },
 *   });
 *   return errorResponse;
 * }
 * ```
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): ErrorResponse {
  const { correlationId, context } = options;

  // Build log metadata
  const metadata: LogMetadata = {
    ...context,
    correlationId,
  };

  // Log the error with appropriate level and metadata
  if (error instanceof Error) {
    // Add error-specific metadata
    if (isSkyFiError(error)) {
      metadata.errorCode = error.code;
      if (error instanceof SkyFiAPIError) {
        metadata.statusCode = error.statusCode;
        metadata['apiErrorCode'] = error.apiErrorCode;
      } else if (error instanceof ValidationError) {
        metadata['field'] = error.field;
      } else if (error instanceof NotFoundError) {
        metadata['resourceType'] = error.resourceType;
        metadata['resourceId'] = error.resourceId;
      }
    }

    // Log with full error details
    logError('Error occurred', error, metadata);
  } else {
    // Log unknown errors
    logger.error('Unknown error occurred', {
      ...metadata,
      error: String(error),
    });
  }

  // Convert to normalized error response
  return toErrorResponse(error, options);
}

/**
 * Wraps an async function with error handling
 *
 * This higher-order function wraps an async function and automatically
 * handles any errors that are thrown, logging them and converting them
 * to normalized error responses.
 *
 * @param fn - Async function to wrap
 * @param options - Error handler options
 * @returns Wrapped function that handles errors
 *
 * @example
 * ```typescript
 * const safeSearch = withErrorHandling(
 *   async (params) => await searchArchives(params),
 *   { context: { operation: 'searchArchives' } },
 * );
 *
 * const result = await safeSearch(params);
 * // If error occurs, it will be logged and returned as ErrorResponse
 * ```
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: ErrorHandlerOptions = {},
): (...args: T) => Promise<R | ErrorResponse> {
  return async (...args: T): Promise<R | ErrorResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleError(error, options);
    }
  };
}

/**
 * Checks if a value is an error response
 *
 * This type guard helps distinguish between successful results and
 * error responses in code that uses withErrorHandling.
 *
 * @param value - Value to check
 * @returns True if value is an ErrorResponse
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object'
    && value !== null
    && 'code' in value
    && 'message' in value
    && typeof (value as ErrorResponse).code === 'string'
    && typeof (value as ErrorResponse).message === 'string'
  );
}

/**
 * Extracts HTTP status code from an error
 *
 * This function determines the appropriate HTTP status code for an error,
 * which is useful for HTTP API responses.
 *
 * @param error - Error to extract status code from
 * @returns HTTP status code
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof SkyFiAPIError) {
    return error.statusCode;
  }

  if (error instanceof NotFoundError) {
    return 404;
  }

  if (error instanceof AuthenticationError) {
    return 401;
  }

  if (error instanceof ValidationError) {
    return 400;
  }

  if (error instanceof RateLimitError) {
    return 429;
  }

  if (error instanceof TimeoutError) {
    return 408;
  }

  if (error instanceof ConfigurationError) {
    return 500;
  }

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Formats an error for user-facing display
 *
 * This function creates a user-friendly error message that can be
 * displayed in UIs or returned to API clients.
 *
 * @param error - Error to format
 * @returns User-friendly error message
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    if (error.errors && error.errors.length > 0) {
      return `Validation failed: ${error.errors.map((e) => e.message).join(', ')}`;
    }
    return error.message;
  }

  if (error instanceof AuthenticationError) {
    return 'Authentication failed. Please check your API credentials.';
  }

  if (error instanceof RateLimitError) {
    const retryMsg = error.retryAfter ? ` Please retry after ${error.retryAfter} seconds.` : '';
    return `Rate limit exceeded.${retryMsg}`;
  }

  if (error instanceof NotFoundError) {
    return error.message;
  }

  if (error instanceof SkyFiAPIError) {
    return `SkyFi API error: ${error.message}`;
  }

  if (error instanceof ConfigurationError) {
    return `Configuration error: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
