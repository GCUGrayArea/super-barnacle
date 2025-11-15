/**
 * Base types for SkyFi API client
 *
 * @packageDocumentation
 */

/**
 * Request options for API calls
 */
export interface RequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Correlation ID for request tracing */
  correlationId?: string;
}
