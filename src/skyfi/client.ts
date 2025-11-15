/**
 * SkyFi API HTTP Client
 *
 * This module provides the foundational HTTP client for the SkyFi Platform API.
 * It handles authentication, retry logic, rate limiting, request/response
 * interceptors, and error handling.
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';

import {
  SkyFiAPIError,
  ConfigurationError,
  TimeoutError,
  RateLimitError,
} from '../lib/errors.js';
import { logger, generateCorrelationId } from '../lib/logger.js';
import { RateLimiter } from '../lib/rate-limiter.js';
import { withRetry } from '../lib/retry.js';
import type {
  SkyFiClientConfig,
  RequestContext,
  ApiResponse,
} from '../types/skyfi-base.js';

import { validateConfig, mergeWithDefaults } from './config.js';

/**
 * SkyFi API HTTP Client
 *
 * Provides authenticated HTTP requests to the SkyFi Platform API with
 * automatic retry, rate limiting, and comprehensive error handling.
 *
 * @example
 * ```typescript
 * const client = new SkyFiClient({
 *   apiKey: process.env.SKYFI_API_KEY,
 * });
 *
 * const archives = await client.get('/archives', {
 *   params: { aoi: 'POLYGON(...)' }
 * });
 * ```
 */
export class SkyFiClient {
  /**
   * Axios instance for HTTP requests
   */
  private readonly axios: AxiosInstance;

  /**
   * Rate limiter instance
   */
  private readonly rateLimiter: RateLimiter;

  /**
   * Client configuration
   */
  private readonly config: Required<SkyFiClientConfig>;

  /**
   * Creates a new SkyFiClient
   *
   * @param config - Client configuration
   * @throws {ConfigurationError} If configuration is invalid
   *
   * @example
   * ```typescript
   * const client = new SkyFiClient({
   *   apiKey: 'sk_live_...',
   *   baseURL: 'https://app.skyfi.com/platform-api',
   *   timeout: 30000,
   * });
   * ```
   */
  constructor(config: SkyFiClientConfig) {
    // Validate and merge configuration
    validateConfig(config);
    this.config = mergeWithDefaults(config);

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(this.config.rateLimit);

    // Create Axios instance
    this.axios = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Skyfi-Api-Key': this.config.apiKey,
      },
    });

    // Setup interceptors
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();

    logger.info('SkyFiClient initialized', {
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.retry.maxRetries,
      requestsPerSecond: this.config.rateLimit.requestsPerSecond,
    });
  }

  /**
   * Sets up request interceptor for logging and correlation IDs
   */
  private setupRequestInterceptor(): void {
    this.axios.interceptors.request.use(
      (config) => {
        // Add correlation ID for request tracing
        const correlationId = generateCorrelationId();
        config.headers.set('X-Correlation-Id', correlationId);

        // Store request context for logging
        const context: RequestContext = {
          correlationId,
          method: config.method?.toUpperCase() ?? 'GET',
          url: config.url ?? '',
          startTime: Date.now(),
        };

        // Store context in request config for later use
        // eslint-disable-next-line no-param-reassign
        (config as unknown as { context: RequestContext }).context = context;

        logger.debug('HTTP request', {
          correlationId,
          method: context.method,
          url: context.url,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          params: config.params,
        });

        return config;
      },
      (error) => {
        logger.error('Request interceptor error', {
          error: error instanceof Error ? error.message : String(error),
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Sets up response interceptor for logging and error handling
   */
  private setupResponseInterceptor(): void {
    this.axios.interceptors.response.use(
      (response) => {
        const { context } = (response.config as unknown as { context?: RequestContext });
        const duration = context ? Date.now() - context.startTime : undefined;

        logger.debug('HTTP response', {
          correlationId: context?.correlationId,
          method: context?.method,
          url: context?.url,
          status: response.status,
          durationMs: duration,
        });

        return response;
      },
      (error) => {
        const axiosError = error as AxiosError;
        const context = (axiosError.config as unknown as { context?: RequestContext })?.context;
        const duration = context ? Date.now() - context.startTime : undefined;

        logger.error('HTTP error', {
          correlationId: context?.correlationId,
          method: context?.method,
          url: context?.url,
          status: axiosError.response?.status,
          durationMs: duration,
          error: axiosError.message,
        });

        return Promise.reject(error);
      },
    );
  }

  /**
   * Makes an HTTP GET request
   *
   * @param url - Request URL (relative to base URL)
   * @param config - Axios request configuration
   * @returns Promise with response data
   * @throws {SkyFiAPIError} If request fails
   *
   * @example
   * ```typescript
   * const archives = await client.get('/archives', {
   *   params: { aoi: 'POLYGON(...)' }
   * });
   * ```
   */
  public async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * Makes an HTTP POST request
   *
   * @param url - Request URL (relative to base URL)
   * @param data - Request body data
   * @param config - Axios request configuration
   * @returns Promise with response data
   * @throws {SkyFiAPIError} If request fails
   *
   * @example
   * ```typescript
   * const order = await client.post('/order-archive', {
   *   archiveId: '123',
   *   aoi: 'POLYGON(...)',
   * });
   * ```
   */
  public async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config, method: 'POST', url, data,
    });
  }

  /**
   * Makes an HTTP PUT request
   *
   * @param url - Request URL (relative to base URL)
   * @param data - Request body data
   * @param config - Axios request configuration
   * @returns Promise with response data
   * @throws {SkyFiAPIError} If request fails
   */
  public async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config, method: 'PUT', url, data,
    });
  }

  /**
   * Makes an HTTP DELETE request
   *
   * @param url - Request URL (relative to base URL)
   * @param config - Axios request configuration
   * @returns Promise with response data
   * @throws {SkyFiAPIError} If request fails
   */
  public async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Makes an HTTP request with retry and rate limiting
   *
   * @param config - Axios request configuration
   * @returns Promise with response data
   * @throws {SkyFiAPIError} If request fails after retries
   * @throws {TimeoutError} If request times out
   * @throws {RateLimitError} If rate limit is exceeded
   */
  private async request<T = unknown>(
    config: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();

    try {
      // Acquire rate limit token
      await this.rateLimiter.acquire();

      // Make request with retry logic
      const response = await withRetry<AxiosResponse<T>>(
        () => this.axios.request<T>(config),
        this.config.retry,
      );

      const duration = Date.now() - startTime;

      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
        duration,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handles errors and converts them to appropriate error types
   *
   * @param error - Error to handle
   * @returns Appropriate error instance
   */
  private handleError(error: unknown): Error {
    if (!axios.isAxiosError(error)) {
      // Non-Axios error, return as-is
      return error instanceof Error ? error : new Error(String(error));
    }

    const axiosError = error as AxiosError;

    // Timeout error
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return new TimeoutError(
        `Request timed out after ${this.config.timeout}ms`,
        this.config.timeout,
        {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
        },
      );
    }

    // Rate limit error
    if (axiosError.response?.status === 429) {
      const retryAfter = axiosError.response.headers['retry-after']
        ? parseInt(axiosError.response.headers['retry-after'] as string, 10)
        : undefined;

      return new RateLimitError(
        'Rate limit exceeded',
        retryAfter,
        {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          retryAfter,
        },
      );
    }

    // API error with response
    if (axiosError.response) {
      const statusCode = axiosError.response.status;
      const responseData = axiosError.response.data as { detail?: string; message?: string };
      const errorMessage = responseData?.detail
        ?? responseData?.message
        ?? `HTTP ${statusCode} error`;

      return new SkyFiAPIError(
        errorMessage,
        statusCode,
        undefined,
        {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          responseData,
        },
      );
    }

    // Network error (no response)
    return new SkyFiAPIError(
      `Network error: ${axiosError.message}`,
      0,
      axiosError.code,
      {
        url: axiosError.config?.url,
        method: axiosError.config?.method,
        code: axiosError.code,
      },
    );
  }

  /**
   * Gets the current rate limiter status
   *
   * @returns Rate limiter status
   */
  public getRateLimiterStatus(): {
    availableTokens: number;
    queueLength: number;
  } {
    return {
      availableTokens: this.rateLimiter.getAvailableTokens(),
      queueLength: this.rateLimiter.getQueueLength(),
    };
  }

  /**
   * Destroys the client and cleans up resources
   *
   * Should be called when the client is no longer needed.
   */
  public destroy(): void {
    this.rateLimiter.destroy();
    logger.info('SkyFiClient destroyed');
  }
}

/**
 * Creates a SkyFiClient from environment variables
 *
 * @returns SkyFiClient instance
 * @throws {ConfigurationError} If SKYFI_API_KEY is not set
 *
 * @example
 * ```typescript
 * const client = createClient();
 * const archives = await client.get('/archives');
 * ```
 */
export function createClient(): SkyFiClient {
  const apiKey = process.env['SKYFI_API_KEY'];

  if (!apiKey) {
    throw new ConfigurationError(
      'SKYFI_API_KEY environment variable is required',
      'SKYFI_API_KEY',
    );
  }

  return new SkyFiClient({ apiKey });
}
