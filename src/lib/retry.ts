/**
 * Retry logic with exponential backoff
 *
 * This module provides retry functionality for transient errors, using
 * exponential backoff to avoid overwhelming services during outages.
 */

import type { RetryConfig } from '../types/skyfi-base.js';

import { logger } from './logger.js';

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Error with HTTP status code
 */
interface ErrorWithStatus {
  response?: {
    status: number;
  };
  code?: string;
}

/**
 * Determines if an error is retryable
 *
 * Retryable errors include:
 * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
 * - 5xx server errors
 * - 408 Request Timeout
 * - 429 Too Many Requests
 *
 * Non-retryable errors include:
 * - 4xx client errors (except 408, 429)
 * - Authentication errors
 *
 * @param error - Error to check
 * @param retryableStatusCodes - HTTP status codes that should trigger retry
 * @returns True if error is retryable
 */
export function isRetryableError(
  error: unknown,
  retryableStatusCodes: number[] = DEFAULT_CONFIG.retryableStatusCodes,
): boolean {
  if (!error) {
    return false;
  }

  const err = error as ErrorWithStatus;

  // Network errors (no response received)
  if (!err.response && err.code) {
    const networkErrorCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];
    return networkErrorCodes.includes(err.code);
  }

  // HTTP status code errors
  if (err.response?.status) {
    return retryableStatusCodes.includes(err.response.status);
  }

  return false;
}

/**
 * Calculates delay for exponential backoff
 *
 * Formula: min(baseDelay * 2^attempt, maxDelay)
 *
 * @param attempt - Current retry attempt (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 *
 * @example
 * ```typescript
 * calculateBackoff(0, 1000, 30000) // 1000ms (2^0 * 1000)
 * calculateBackoff(1, 1000, 30000) // 2000ms (2^1 * 1000)
 * calculateBackoff(2, 1000, 30000) // 4000ms (2^2 * 1000)
 * calculateBackoff(10, 1000, 30000) // 30000ms (capped at maxDelay)
 * ```
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number = DEFAULT_CONFIG.baseDelay,
  maxDelay: number = DEFAULT_CONFIG.maxDelay,
): number {
  const exponentialDelay = baseDelay * (2 ** attempt);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Sleeps for a specified duration
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Wraps an async function with retry logic and exponential backoff
 *
 * This higher-order function retries the operation on transient errors,
 * using exponential backoff between attempts.
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @returns Promise with the result of the function
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => axios.get('/api/data'),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  // eslint-disable-next-line no-await-in-loop
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await fn();

      // Log successful retry if this wasn't the first attempt
      if (attempt > 0) {
        logger.info('Operation succeeded after retry', {
          attempt,
          totalAttempts: attempt + 1,
        });
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = isRetryableError(error, finalConfig.retryableStatusCodes);
      const isLastAttempt = attempt === finalConfig.maxRetries;

      if (!shouldRetry || isLastAttempt) {
        // Don't retry on non-retryable errors or if we've exhausted retries
        if (shouldRetry && isLastAttempt) {
          logger.error('Operation failed after all retries', {
            attempt,
            maxRetries: finalConfig.maxRetries,
            error: error instanceof Error ? error.message : String(error),
          });
        } else {
          logger.debug('Operation failed with non-retryable error', {
            attempt,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt, finalConfig.baseDelay, finalConfig.maxDelay);

      logger.warn('Operation failed, retrying after backoff', {
        attempt,
        nextAttempt: attempt + 1,
        maxRetries: finalConfig.maxRetries,
        delayMs: delay,
        error: error instanceof Error ? error.message : String(error),
      });

      // Wait before retrying (intentional await in loop for sequential retries)
      // eslint-disable-next-line no-await-in-loop
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Creates a retry wrapper function with pre-configured retry settings
 *
 * This is useful when you want to reuse the same retry configuration
 * across multiple operations.
 *
 * @param config - Retry configuration
 * @returns Function that wraps operations with retry logic
 *
 * @example
 * ```typescript
 * const retryWithDefaults = createRetryWrapper({ maxRetries: 5 });
 *
 * const data1 = await retryWithDefaults(() => fetchData1());
 * const data2 = await retryWithDefaults(() => fetchData2());
 * ```
 */
export function createRetryWrapper(
  config: RetryConfig = {},
): <T>(fn: () => Promise<T>) => Promise<T> {
  return <T>(fn: () => Promise<T>) => withRetry(fn, config);
}
