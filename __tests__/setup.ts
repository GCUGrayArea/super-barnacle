/**
 * Jest Test Environment Setup
 *
 * This file runs before all tests to configure the test environment,
 * set up global mocks, and initialize test utilities.
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env['NODE_ENV'] = 'test';

// Mock environment variables for tests
process.env['SKYFI_API_KEY'] = process.env['SKYFI_API_KEY'] ?? 'test-api-key-mock';
process.env['OPENAI_API_KEY'] = process.env['OPENAI_API_KEY'] ?? 'test-openai-key-mock';
process.env['LOG_LEVEL'] = process.env['LOG_LEVEL'] ?? 'error'; // Reduce noise in tests

// Note: Test timeout is configured in jest.config.cjs (30 seconds)

// Export test utilities
export const testUtils = {
  /**
   * Wait for a specified number of milliseconds
   */
  wait: (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),

  /**
   * Generate a random test ID
   */
  randomId: (): string => `test-${Math.random().toString(36).substring(2, 15)}`,
};
