module.exports = {
  // Use ts-jest preset for TypeScript support with ES modules
  preset: 'ts-jest/presets/default-esm',

  // Test environment
  testEnvironment: 'node',

  // Enable ES modules
  extensionsToTreatAsEsm: ['.ts'],

  // Add module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Root directory
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts',
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

  coverageDirectory: 'coverage',

  coverageReporters: ['text', 'lcov', 'html'],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

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

  // Timeout for tests (30 seconds)
  testTimeout: 30000,

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  modulePathIgnorePatterns: ['/dist/'],

  // Transform node_modules that are ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol)/)',
  ],
};
