/**
 * Base type definitions for SkyFi API client
 *
 * This module provides core type definitions used throughout the SkyFi client
 * implementation, including configuration, retry, and rate limiting types.
 */

/**
 * Configuration for the SkyFi API client
 */
export interface SkyFiClientConfig {
  /**
   * SkyFi API key for authentication
   * This will be sent as X-Skyfi-Api-Key header
   */
  apiKey: string;

  /**
   * Base URL for the SkyFi API
   * @default 'https://app.skyfi.com/platform-api'
   */
  baseURL?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: RetryConfig;

  /**
   * Rate limiting configuration
   */
  rateLimit?: RateLimitConfig;
}

/**
 * Configuration for retry logic with exponential backoff
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Base delay in milliseconds for exponential backoff
   * Actual delay = 2^attempt * baseDelay
   * @default 1000
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds to cap exponential backoff
   * @default 30000
   */
  maxDelay?: number;

  /**
   * HTTP status codes that should trigger a retry
   * @default [408, 429, 500, 502, 503, 504]
   */
  retryableStatusCodes?: number[];
}

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests per second
   * @default 10
   */
  requestsPerSecond?: number;

  /**
   * Maximum number of tokens in the bucket
   * @default 10
   */
  bucketSize?: number;
}

/**
 * Request context for logging and tracing
 */
export interface RequestContext {
  /**
   * Correlation ID for request tracing
   */
  correlationId?: string;

  /**
   * HTTP method
   */
  method: string;

  /**
   * Request URL (without base URL)
   */
  url: string;

  /**
   * Request start time
   */
  startTime: number;

  /**
   * Current retry attempt (0 for first attempt)
   */
  retryAttempt?: number;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  /**
   * Response data
   */
  data: T;

  /**
   * HTTP status code
   */
  status: number;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Request duration in milliseconds
   */
  duration?: number;
}

/**
 * Error details from SkyFi API
 */
export interface ApiErrorDetails {
  /**
   * Error message from API
   */
  message: string;

  /**
   * API-specific error code
   */
  code?: string;

  /**
   * Additional error details
   */
  details?: Record<string, unknown>;
}
