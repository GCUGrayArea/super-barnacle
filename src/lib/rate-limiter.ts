/**
 * Rate limiter using token bucket algorithm
 *
 * This module provides rate limiting functionality to respect API limits
 * and avoid overwhelming the SkyFi API with too many concurrent requests.
 */

import type { RateLimitConfig } from '../types/skyfi-base.js';

import { logger } from './logger.js';

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  requestsPerSecond: 10,
  bucketSize: 10,
};

/**
 * Pending request in the queue
 */
interface PendingRequest {
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Token bucket rate limiter
 *
 * Implements the token bucket algorithm to limit the rate of requests.
 * Tokens are added to the bucket at a fixed rate, and each request
 * consumes one token. If no tokens are available, requests are queued.
 *
 * @see https://en.wikipedia.org/wiki/Token_bucket
 */
export class RateLimiter {
  /**
   * Number of requests allowed per second
   */
  private readonly requestsPerSecond: number;

  /**
   * Maximum number of tokens in the bucket
   */
  private readonly bucketSize: number;

  /**
   * Current number of tokens available
   */
  private tokens: number;

  /**
   * Timestamp of last token refill
   */
  private lastRefillTime: number;

  /**
   * Queue of pending requests
   */
  private queue: PendingRequest[] = [];

  /**
   * Interval ID for processing queue
   */
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Creates a new RateLimiter
   *
   * @param config - Rate limit configuration
   *
   * @example
   * ```typescript
   * const limiter = new RateLimiter({ requestsPerSecond: 10 });
   * await limiter.acquire();
   * // Make request
   * ```
   */
  constructor(config: RateLimitConfig = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    this.requestsPerSecond = finalConfig.requestsPerSecond;
    this.bucketSize = finalConfig.bucketSize;
    this.tokens = this.bucketSize;
    this.lastRefillTime = Date.now();

    logger.debug('RateLimiter initialized', {
      requestsPerSecond: this.requestsPerSecond,
      bucketSize: this.bucketSize,
    });
  }

  /**
   * Acquires a token from the bucket
   *
   * If a token is available, it's consumed immediately. Otherwise,
   * the request is queued until a token becomes available.
   *
   * @returns Promise that resolves when a token is acquired
   *
   * @example
   * ```typescript
   * await limiter.acquire();
   * const response = await axios.get('/api/data');
   * ```
   */
  public async acquire(): Promise<void> {
    this.refillTokens();

    if (this.tokens > 0) {
      this.tokens -= 1;
      logger.debug('Token acquired', {
        remainingTokens: this.tokens,
        queueLength: this.queue.length,
      });
      return Promise.resolve();
    }

    // No tokens available, queue the request
    return new Promise((resolve, reject) => {
      this.queue.push({
        resolve,
        reject,
        timestamp: Date.now(),
      });

      logger.debug('Request queued', {
        queueLength: this.queue.length,
        remainingTokens: this.tokens,
      });

      // Start processing queue if not already running
      if (!this.processingInterval) {
        this.startProcessingQueue();
      }
    });
  }

  /**
   * Refills tokens based on elapsed time
   *
   * Tokens are refilled at the configured rate (requestsPerSecond).
   * The bucket cannot exceed the maximum bucket size.
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefillTime;
    const elapsedSeconds = elapsedMs / 1000;

    // Calculate how many tokens to add
    const tokensToAdd = elapsedSeconds * this.requestsPerSecond;

    if (tokensToAdd >= 1) {
      const oldTokens = this.tokens;
      this.tokens = Math.min(this.bucketSize, this.tokens + Math.floor(tokensToAdd));
      this.lastRefillTime = now;

      if (this.tokens > oldTokens) {
        logger.debug('Tokens refilled', {
          tokensAdded: this.tokens - oldTokens,
          currentTokens: this.tokens,
          bucketSize: this.bucketSize,
        });
      }
    }
  }

  /**
   * Starts processing the queue
   *
   * Processes queued requests at regular intervals, consuming tokens
   * as they become available.
   */
  private startProcessingQueue(): void {
    // Process queue every 100ms
    const intervalMs = 100;

    this.processingInterval = setInterval(() => {
      this.processQueue();

      // Stop processing if queue is empty
      if (this.queue.length === 0 && this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
        logger.debug('Queue processing stopped (queue empty)');
      }
    }, intervalMs);

    logger.debug('Started queue processing', {
      intervalMs,
      queueLength: this.queue.length,
    });
  }

  /**
   * Processes queued requests
   *
   * Refills tokens and processes as many queued requests as possible.
   */
  private processQueue(): void {
    this.refillTokens();

    while (this.queue.length > 0 && this.tokens > 0) {
      const request = this.queue.shift();
      if (request) {
        this.tokens -= 1;
        request.resolve();

        logger.debug('Queued request processed', {
          waitTimeMs: Date.now() - request.timestamp,
          remainingQueueLength: this.queue.length,
          remainingTokens: this.tokens,
        });
      }
    }
  }

  /**
   * Gets the current number of available tokens
   *
   * @returns Current token count
   */
  public getAvailableTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * Gets the current queue length
   *
   * @returns Number of requests waiting in queue
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clears the queue and resets the rate limiter
   *
   * All pending requests will be rejected with an error.
   */
  public reset(): void {
    // Reject all pending requests
    const error = new Error('Rate limiter reset');
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        request.reject(error);
      }
    }

    // Stop processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Reset tokens
    this.tokens = this.bucketSize;
    this.lastRefillTime = Date.now();

    logger.debug('Rate limiter reset', {
      bucketSize: this.bucketSize,
      requestsPerSecond: this.requestsPerSecond,
    });
  }

  /**
   * Destroys the rate limiter and cleans up resources
   *
   * Should be called when the rate limiter is no longer needed.
   */
  public destroy(): void {
    this.reset();
    logger.debug('Rate limiter destroyed');
  }
}

/**
 * Creates a rate-limited function wrapper
 *
 * This function wraps an async function with rate limiting, ensuring
 * that calls to the function respect the rate limit.
 *
 * @param fn - Function to wrap with rate limiting
 * @param config - Rate limit configuration
 * @returns Rate-limited function
 *
 * @example
 * ```typescript
 * const rateLimitedFetch = createRateLimitedFunction(
 *   (url: string) => axios.get(url),
 *   { requestsPerSecond: 5 }
 * );
 *
 * const result = await rateLimitedFetch('/api/data');
 * ```
 */
export function createRateLimitedFunction<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  config: RateLimitConfig = {},
): (...args: Args) => Promise<Result> {
  const limiter = new RateLimiter(config);

  return async (...args: Args): Promise<Result> => {
    await limiter.acquire();
    return fn(...args);
  };
}
