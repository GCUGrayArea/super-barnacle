/**
 * Custom error classes for SkyFi MCP
 *
 * Provides standardized error types for different failure scenarios
 * throughout the application.
 *
 * @packageDocumentation
 */

/**
 * Base error for SkyFi API-related failures
 */
export class SkyFiAPIError extends Error {
  /**
   * Create a SkyFi API error
   *
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code from API response
   * @param errorCode - Optional error code from API
   * @param details - Additional error details
   */
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SkyFiAPIError';
    Object.setPrototypeOf(this, SkyFiAPIError.prototype);
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends Error {
  /**
   * Create a validation error
   *
   * @param message - Human-readable error message
   * @param field - Optional field name that failed validation
   * @param details - Additional validation error details
   */
  constructor(
    message: string,
    public field?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends Error {
  /**
   * Create an authentication error
   *
   * @param message - Human-readable error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends Error {
  /**
   * Create a rate limit error
   *
   * @param message - Human-readable error message
   * @param retryAfter - Optional seconds until retry is allowed
   */
  constructor(
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Error for authorization failures
 */
export class AuthorizationError extends Error {
  /**
   * Create an authorization error
   *
   * @param message - Human-readable error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Error for not found resources
 */
export class NotFoundError extends Error {
  /**
   * Create a not found error
   *
   * @param message - Human-readable error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error for delivery configuration validation failures
 */
export class DeliveryValidationError extends ValidationError {
  /**
   * Create a delivery validation error
   *
   * @param message - Human-readable error message
   * @param driver - Delivery driver that failed validation
   * @param field - Optional field name that failed validation
   */
  constructor(
    message: string,
    public driver: string,
    field?: string,
  ) {
    super(message, field);
    this.name = 'DeliveryValidationError';
    Object.setPrototypeOf(this, DeliveryValidationError.prototype);
  }
}

/**
 * Error for AOI validation failures
 */
export class AOIValidationError extends ValidationError {
  /**
   * Create an AOI validation error
   *
   * @param message - Human-readable error message
   */
  constructor(message: string) {
    super(message, 'aoi');
    this.name = 'AOIValidationError';
    Object.setPrototypeOf(this, AOIValidationError.prototype);
  }
}
