/**
 * SkyFi API configuration
 *
 * This module handles configuration loading and validation for the SkyFi API client.
 * Configuration is loaded from environment variables with sensible defaults.
 */

import { ConfigurationError } from '../lib/errors.js';
import type { SkyFiClientConfig, RetryConfig, RateLimitConfig } from '../types/skyfi-base.js';

/**
 * Default SkyFi API base URL
 */
export const DEFAULT_BASE_URL = 'https://app.skyfi.com/platform-api';

/**
 * Default request timeout in milliseconds (30 seconds)
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: Required<RateLimitConfig> = {
  requestsPerSecond: 10,
  bucketSize: 10,
};

/**
 * Load SkyFi API configuration from environment variables
 *
 * @returns SkyFiClientConfig with values from environment or defaults
 * @throws {ConfigurationError} If SKYFI_API_KEY is not set
 *
 * @example
 * ```typescript
 * const config = loadConfig();
 * const client = new SkyFiClient(config);
 * ```
 */
export function loadConfig(): SkyFiClientConfig {
  const apiKey = process.env['SKYFI_API_KEY'];

  if (!apiKey) {
    throw new ConfigurationError(
      'SKYFI_API_KEY environment variable is required',
      'SKYFI_API_KEY',
    );
  }

  const baseURL = process.env['SKYFI_API_BASE_URL'] ?? DEFAULT_BASE_URL;
  const timeout = process.env['SKYFI_REQUEST_TIMEOUT']
    ? parseInt(process.env['SKYFI_REQUEST_TIMEOUT'], 10)
    : DEFAULT_TIMEOUT;

  // Validate timeout
  if (Number.isNaN(timeout) || timeout <= 0) {
    throw new ConfigurationError(
      `Invalid SKYFI_REQUEST_TIMEOUT: must be a positive number, got "${process.env['SKYFI_REQUEST_TIMEOUT']}"`,
      'SKYFI_REQUEST_TIMEOUT',
    );
  }

  return {
    apiKey,
    baseURL,
    timeout,
    retry: { ...DEFAULT_RETRY_CONFIG },
    rateLimit: { ...DEFAULT_RATE_LIMIT_CONFIG },
  };
}

/**
 * Validates if a string is a valid URL
 *
 * @param url - URL string to validate
 * @returns True if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates a SkyFiClientConfig object
 *
 * @param config - Configuration to validate
 * @throws {ConfigurationError} If configuration is invalid
 */
export function validateConfig(config: SkyFiClientConfig): void {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new ConfigurationError('API key cannot be empty', 'apiKey');
  }

  if (config.baseURL && !isValidUrl(config.baseURL)) {
    throw new ConfigurationError(
      `Invalid base URL: ${config.baseURL}`,
      'baseURL',
    );
  }

  if (config.timeout !== undefined && (config.timeout <= 0 || !Number.isFinite(config.timeout))) {
    throw new ConfigurationError(
      `Timeout must be a positive number, got ${config.timeout}`,
      'timeout',
    );
  }

  if (config.retry?.maxRetries !== undefined) {
    if (config.retry.maxRetries < 0 || !Number.isInteger(config.retry.maxRetries)) {
      throw new ConfigurationError(
        `Max retries must be a non-negative integer, got ${config.retry.maxRetries}`,
        'retry.maxRetries',
      );
    }
  }

  if (config.retry?.baseDelay !== undefined) {
    if (config.retry.baseDelay <= 0 || !Number.isFinite(config.retry.baseDelay)) {
      throw new ConfigurationError(
        `Base delay must be a positive number, got ${config.retry.baseDelay}`,
        'retry.baseDelay',
      );
    }
  }

  if (config.rateLimit?.requestsPerSecond !== undefined) {
    const { requestsPerSecond } = config.rateLimit;
    if (requestsPerSecond <= 0 || !Number.isFinite(requestsPerSecond)) {
      throw new ConfigurationError(
        `Requests per second must be a positive number, got ${requestsPerSecond}`,
        'rateLimit.requestsPerSecond',
      );
    }
  }
}

/**
 * Merges partial configuration with defaults
 *
 * @param partial - Partial configuration to merge
 * @returns Complete configuration with defaults applied
 *
 * @example
 * ```typescript
 * const config = mergeWithDefaults({ apiKey: 'sk_test_...' });
 * // Returns config with default baseURL, timeout, retry, and rateLimit
 * ```
 */
export function mergeWithDefaults(partial: SkyFiClientConfig): Required<SkyFiClientConfig> {
  return {
    apiKey: partial.apiKey,
    baseURL: partial.baseURL ?? DEFAULT_BASE_URL,
    timeout: partial.timeout ?? DEFAULT_TIMEOUT,
    retry: {
      ...DEFAULT_RETRY_CONFIG,
      ...partial.retry,
    },
    rateLimit: {
      ...DEFAULT_RATE_LIMIT_CONFIG,
      ...partial.rateLimit,
    },
  };
}
