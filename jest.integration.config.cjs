/**
 * Jest Configuration for Integration Tests
 *
 * This configuration is specifically for integration tests that test
 * the full client flow with mocked HTTP responses.
 *
 * Run with: npm run test:integration
 */

module.exports = {
  // Use ts-jest preset for TypeScript support with ES modules
  preset: 'ts-jest/presets/default-esm',

  // Test environment
  testEnvironment: 'node',

  // Enable ES modules
  extensionsToTreatAsEsm: ['.ts'],

  // Add module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Display name for integration tests
  displayName: {
    name: 'Integration Tests',
    color: 'blue',
  },

  // Root directory
  roots: ['<rootDir>/__tests__/integration'],

  // Test file patterns - only integration tests
  testMatch: [
    '**/__tests__/integration/**/*.test.ts',
    '**/__tests__/integration/**/*.spec.ts',
    '**/*.integration.test.ts',
    '**/*.integration.spec.ts',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],

  // Module paths matching tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/mcp/(.*)$': '<rootDir>/src/mcp/$1',
    '^@/skyfi/(.*)$': '<rootDir>/src/skyfi/$1',
    '^@/agent/(.*)$': '<rootDir>/src/agent/$1',
    '^@/db/(.*)$': '<rootDir>/src/db/$1',
    // Handle .js extensions in TypeScript imports
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
  ],

  coverageDirectory: 'coverage/integration',

  coverageReporters: ['text', 'lcov', 'html'],

  // Transform files with ts-jest
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          isolatedModules: true,
          module: 'ESNext',
        },
      },
    ],
  },

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Timeout for tests (30 seconds - integration tests may take longer)
  testTimeout: 30000,

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/__tests__/skyfi/', '/__tests__/mcp/'],

  modulePathIgnorePatterns: ['/dist/'],

  // Transform node_modules that are ES modules
  transformIgnorePatterns: ['node_modules/(?!(@modelcontextprotocol)/)'],

  // Maximum workers for parallel execution
  maxWorkers: '50%',
};
