/**
 * SkyFi API HTTP Client
 *
 * This module provides the base HTTP client for interacting with the SkyFi API
 * with authentication, retry logic, and error handling.
 *
 * @packageDocumentation
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios';
import { logger } from '../lib/logger.js';
import {
  SkyFiAPIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from '../lib/errors.js';
import { retryWithBackoff } from '../lib/retry.js';
import type { SkyFiConfig } from './config.js';
import type { BadRequestResponse } from '../types/skyfi-api.js';

/**
 * SkyFi API HTTP Client
 */
export class SkyFiClient {
  private axiosInstance: AxiosInstance;

  private config: SkyFiConfig;

  /**
   * Create a new SkyFi API client
   *
   * @param config - SkyFi API configuration
   */
  constructor(config: SkyFiConfig) {
    this.config = config;

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Skyfi-Api-Key': config.apiKey,
      },
    });

    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (requestConfig) => {
        if (this.config.debug) {
          logger.debug('SkyFi API request', {
            method: requestConfig.method,
            url: requestConfig.url,
            params: requestConfig.params,
          });
        }
        return requestConfig;
      },
      (error) => {
        logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging and error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          logger.debug('SkyFi API response', {
            status: response.status,
            url: response.config.url,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        await this.handleError(error);
      },
    );
  }

  /**
   * Handle axios errors and convert to custom error types
   */
  private async handleError(error: AxiosError): Promise<never> {
    if (!error.response) {
      // Network error
      logger.error('Network error', { error: error.message });
      throw new SkyFiAPIError('Network error: Unable to reach SkyFi API', 0, 'NETWORK_ERROR');
    }

    const { status, data } = error.response;
    const errorData = data as BadRequestResponse;

    logger.error('SkyFi API error', {
      status,
      url: error.config?.url,
      errorCode: errorData.errorCode,
      message: errorData.message,
    });

    switch (status) {
      case 401:
        throw new AuthenticationError(
          errorData.message ?? 'Authentication failed. Check your API key.',
        );

      case 404:
        throw new NotFoundError(errorData.message ?? 'Resource not found');

      case 429:
        {
          const retryAfter = error.response.headers['retry-after']
            ? parseInt(error.response.headers['retry-after'] as string, 10)
            : undefined;
          throw new RateLimitError(
            errorData.message ?? 'Rate limit exceeded. Please try again later.',
            retryAfter,
          );
        }

      case 422:
        throw new SkyFiAPIError(
          errorData.message ?? 'Validation error',
          status,
          errorData.errorCode,
          errorData.details as Record<string, unknown> | undefined,
        );

      default:
        throw new SkyFiAPIError(
          errorData.message ?? `API error: ${status}`,
          status,
          errorData.errorCode,
          errorData.details as Record<string, unknown> | undefined,
        );
    }
  }

  /**
   * Execute a GET request with retry logic
   *
   * @param path - API endpoint path
   * @param config - Axios request configuration
   * @returns Response data
   */
  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return retryWithBackoff(
      async () => {
        const response = await this.axiosInstance.get<T>(path, config);
        return response.data;
      },
      {
        maxRetries: this.config.maxRetries,
        isRetryable: (error: unknown) =>
          error instanceof RateLimitError ||
          (error instanceof Error && error.message.includes('ECONNRESET')),
      },
    );
  }

  /**
   * Execute a POST request with retry logic
   *
   * @param path - API endpoint path
   * @param data - Request body data
   * @param config - Axios request configuration
   * @returns Response data
   */
  async post<T, D = unknown>(path: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    return retryWithBackoff(
      async () => {
        const response = await this.axiosInstance.post<T>(path, data, config);
        return response.data;
      },
      {
        maxRetries: this.config.maxRetries,
        isRetryable: (error: unknown) =>
          error instanceof RateLimitError ||
          (error instanceof Error && error.message.includes('ECONNRESET')),
      },
    );
  }

  /**
   * Execute a PUT request with retry logic
   *
   * @param path - API endpoint path
   * @param data - Request body data
   * @param config - Axios request configuration
   * @returns Response data
   */
  async put<T, D = unknown>(path: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    return retryWithBackoff(
      async () => {
        const response = await this.axiosInstance.put<T>(path, data, config);
        return response.data;
      },
      {
        maxRetries: this.config.maxRetries,
        isRetryable: (error: unknown) =>
          error instanceof RateLimitError ||
          (error instanceof Error && error.message.includes('ECONNRESET')),
      },
    );
  }

  /**
   * Execute a DELETE request with retry logic
   *
   * @param path - API endpoint path
   * @param config - Axios request configuration
   * @returns Response data
   */
  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return retryWithBackoff(
      async () => {
        const response = await this.axiosInstance.delete<T>(path, config);
        return response.data;
      },
      {
        maxRetries: this.config.maxRetries,
        isRetryable: (error: unknown) =>
          error instanceof RateLimitError ||
          (error instanceof Error && error.message.includes('ECONNRESET')),
      },
    );
  }
}
