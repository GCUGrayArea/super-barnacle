/**
 * SkyFi API Configuration
 *
 * This module provides configuration for the SkyFi API client.
 *
 * @packageDocumentation
 */

/**
 * SkyFi API configuration
 */
export interface SkyFiConfig {
  /** SkyFi API key */
  apiKey: string;
  /** Base URL for SkyFi API */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Default SkyFi API base URL
 */
export const DEFAULT_BASE_URL = 'https://app.skyfi.com/platform-api';

/**
 * Default request timeout (30 seconds)
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Default maximum retry attempts
 */
export const DEFAULT_MAX_RETRIES = 3;

/**
 * Create SkyFi API configuration from environment variables
 *
 * @returns SkyFi API configuration
 * @throws Error if SKYFI_API_KEY is not set
 */
export function createConfigFromEnv(): SkyFiConfig {
  const apiKey = process.env['SKYFI_API_KEY'];
  if (!apiKey) {
    throw new Error('SKYFI_API_KEY environment variable is required');
  }

  return {
    apiKey,
    baseUrl: process.env['SKYFI_BASE_URL'] ?? DEFAULT_BASE_URL,
    timeout: parseInt(process.env['SKYFI_TIMEOUT'] ?? String(DEFAULT_TIMEOUT), 10),
    maxRetries: parseInt(process.env['SKYFI_MAX_RETRIES'] ?? String(DEFAULT_MAX_RETRIES), 10),
    debug: process.env['SKYFI_DEBUG'] === 'true',
  };
}
