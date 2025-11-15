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

// Set default test timeout
jest.setTimeout(30000); // 30 seconds

// Global test setup
beforeAll(() => {
  // Any global setup before all tests
});

// Global test teardown
afterAll(() => {
  // Any global cleanup after all tests
});

// Reset state between tests
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Additional cleanup after each test if needed
});

// Suppress console output in tests unless needed
/* eslint-disable no-console */
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});
/* eslint-enable no-console */

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
