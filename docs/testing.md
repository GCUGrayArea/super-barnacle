# Testing Guide for SkyFi MCP

This document provides comprehensive guidance on running and writing tests for the SkyFi Model Context Protocol Server.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Troubleshooting](#troubleshooting)

## Overview

The SkyFi MCP project uses Jest as its testing framework with comprehensive test coverage across unit tests, integration tests, and end-to-end tests. All tests are written in TypeScript using ts-jest for seamless integration with the codebase.

## Test Types

### Unit Tests

Unit tests focus on testing individual functions, classes, and modules in isolation. They are located in `__tests__/` alongside the code they test.

**Location:** `__tests__/lib/`, `__tests__/skyfi/`, `__tests__/mcp/`

**Examples:**
- `__tests__/lib/logger.test.ts` - Logger functionality
- `__tests__/lib/errors.test.ts` - Error handling
- `__tests__/skyfi/archives.test.ts` - Archive search methods
- `__tests__/mcp/tools/search-archives.test.ts` - MCP tools

### Integration Tests

Integration tests verify the complete client flow with mocked HTTP responses. They test how different parts of the system work together, focusing on API client interactions with high-fidelity mocks.

**Location:** `__tests__/integration/`

**Test Files:**
- `archives.integration.test.ts` - Archive search integration tests
- `orders.integration.test.ts` - Order placement integration tests
- `feasibility.integration.test.ts` - Feasibility checking integration tests
- `order-management.integration.test.ts` - Order management integration tests
- `notifications.integration.test.ts` - Notifications integration tests

**Mock Fixtures:**
- `__tests__/fixtures/skyfi-responses.ts` - Centralized mock API responses

### End-to-End Tests

End-to-end tests verify complete workflows through the entire system stack.

**Location:** `__tests__/e2e/`

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Integration Tests Only

Integration tests can be run separately from unit tests:

```bash
npm run test:integration
```

### Run Integration Tests in Watch Mode

```bash
npm run test:integration:watch
```

### Run Integration Tests with Coverage

```bash
npm run test:integration:coverage
```

### Run End-to-End Tests

```bash
npm run test:e2e
```

### Run Tests with Coverage

Generate a coverage report for all tests:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Writing Tests

### Unit Test Example

```typescript
import { searchArchives } from '../../src/skyfi/archives';
import { SkyFiClient } from '../../src/skyfi/client';

describe('searchArchives', () => {
  let client: SkyFiClient;

  beforeEach(() => {
    // Setup client with mocked axios
    client = new SkyFiClient(config);
  });

  it('should search archives with valid parameters', async () => {
    // Arrange
    const mockResponse = { archives: [], total: 0 };
    mockAxios.post.mockResolvedValue({ data: mockResponse });

    // Act
    const result = await searchArchives(client, {
      aoi: 'POLYGON(...)',
    });

    // Assert
    expect(result.archives).toHaveLength(0);
  });
});
```

### Integration Test Example

Integration tests use centralized mock fixtures:

```typescript
import { searchArchives } from '../../src/skyfi/archives';
import { SkyFiClient } from '../../src/skyfi/client';
import {
  mockArchiveSearchResponse,
  validWKTPolygon,
  mockAuthenticationError,
} from '../fixtures/skyfi-responses';

describe('Archive Search Integration Tests', () => {
  let client: SkyFiClient;

  beforeEach(() => {
    // Setup with mocked axios
  });

  it('should successfully search archives', async () => {
    mockAxios.post.mockResolvedValue({
      data: mockArchiveSearchResponse,
    });

    const result = await searchArchives(client, {
      aoi: validWKTPolygon,
    });

    expect(result.archives).toHaveLength(1);
  });

  it('should handle authentication errors', async () => {
    const authError = new Error('Unauthorized');
    authError.response = {
      status: 401,
      data: mockAuthenticationError,
    };
    mockAxios.post.mockRejectedValue(authError);

    await expect(
      searchArchives(client, { aoi: validWKTPolygon })
    ).rejects.toThrow();
  });
});
```

### Test Patterns

#### 1. Arrange-Act-Assert (AAA)

Follow the AAA pattern for clear, readable tests:

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const mockData = { ... };
  mockAxios.post.mockResolvedValue({ data: mockData });

  // Act - Execute the function under test
  const result = await functionUnderTest(params);

  // Assert - Verify the results
  expect(result).toEqual(expectedResult);
});
```

#### 2. Testing Error Scenarios

Always test both success and error scenarios:

```typescript
describe('Error Scenarios', () => {
  it('should handle 401 authentication errors', async () => {
    const authError = new Error('Unauthorized');
    authError.response = {
      status: 401,
      data: mockAuthenticationError,
    };
    mockAxios.post.mockRejectedValue(authError);

    await expect(functionUnderTest(params)).rejects.toThrow();
  });

  it('should handle 429 rate limit errors', async () => {
    const rateLimitError = new Error('Rate limited');
    rateLimitError.response = {
      status: 429,
      data: mockRateLimitError,
      headers: { 'retry-after': '60' },
    };
    mockAxios.post.mockRejectedValue(rateLimitError);

    await expect(functionUnderTest(params)).rejects.toThrow();
  });
});
```

#### 3. Using Mock Fixtures

Integration tests should use centralized mock fixtures from `__tests__/fixtures/skyfi-responses.ts`:

```typescript
import {
  mockArchiveSearchResponse,
  mockArchiveOrder,
  validWKTPolygon,
  mockS3DeliveryParams,
  mockAuthenticationError,
} from '../fixtures/skyfi-responses';

// Use in tests
mockAxios.post.mockResolvedValue({
  data: mockArchiveSearchResponse,
});
```

#### 4. Testing End-to-End Workflows

Test complete workflows that span multiple operations:

```typescript
describe('End-to-End Workflow', () => {
  it('should complete full order workflow', async () => {
    // Step 1: Search archives
    mockAxios.post.mockResolvedValueOnce({
      data: mockArchiveSearchResponse,
    });
    const archives = await searchArchives(client, { aoi: validWKTPolygon });

    // Step 2: Place order
    mockAxios.request.mockResolvedValueOnce({
      data: mockArchiveOrder,
    });
    const order = await placeArchiveOrder(client, {
      aoi: validWKTPolygon,
      archiveId: archives.archives[0].archiveId,
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: mockS3DeliveryParams,
    });

    // Step 3: Check order status
    mockAxios.get.mockResolvedValueOnce({
      data: order,
    });
    const status = await getOrderById(client, order.orderId);

    expect(status.status).toBeDefined();
  });
});
```

## Test Coverage

### Coverage Thresholds

The project maintains the following coverage thresholds:

- **Branches:** 80%
- **Functions:** 80%
- **Lines:** 80%
- **Statements:** 80%

### Viewing Coverage Reports

After running tests with coverage, open the HTML report:

```bash
npm run test:coverage
# Then open coverage/index.html in your browser
```

### Coverage for Integration Tests

Integration test coverage is stored separately:

```bash
npm run test:integration:coverage
# Then open coverage/integration/index.html in your browser
```

## Troubleshooting

### Common Issues

#### 1. Tests Timeout

If tests are timing out, increase the timeout in the test:

```typescript
it('should complete long operation', async () => {
  // Test code
}, 60000); // 60 second timeout
```

Or globally in `jest.config.cjs` or `jest.integration.config.js`:

```javascript
testTimeout: 30000, // 30 seconds
```

#### 2. Mock Axios Not Working

Ensure axios is properly mocked at the top of your test file:

```typescript
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
```

#### 3. ES Module Import Errors

If you encounter ES module import errors, ensure your imports use `.js` extensions:

```typescript
// Correct
import { searchArchives } from '../../src/skyfi/archives.js';

// Incorrect
import { searchArchives } from '../../src/skyfi/archives';
```

#### 4. Type Errors in Tests

Make sure your test files are included in `tsconfig.json`:

```json
{
  "include": [
    "src/**/*",
    "__tests__/**/*"
  ]
}
```

### Debugging Tests

#### Run a Single Test File

```bash
npm test -- __tests__/integration/archives.integration.test.ts
```

#### Run Tests Matching a Pattern

```bash
npm test -- --testNamePattern="should handle authentication errors"
```

#### Debug Mode

Use Node's inspector:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then attach your debugger (VS Code, Chrome DevTools, etc.).

## Best Practices

1. **Keep Tests Isolated:** Each test should be independent and not rely on other tests.

2. **Use Descriptive Names:** Test names should clearly describe what is being tested.

3. **Test Edge Cases:** Don't just test the happy path; include error scenarios, boundary conditions, and edge cases.

4. **Mock External Dependencies:** Always mock HTTP calls, database queries, and external services.

5. **Use Fixtures:** Leverage centralized mock fixtures for consistency across tests.

6. **Clean Up:** Use `beforeEach` and `afterEach` to set up and tear down test state.

7. **Avoid Test Interdependence:** Tests should pass regardless of execution order.

8. **Keep Tests Fast:** Unit tests should run in milliseconds, integration tests in seconds.

9. **Test Behavior, Not Implementation:** Focus on what the code does, not how it does it.

10. **Review Coverage:** Regularly review coverage reports to identify untested code paths.

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://testingjavascript.com/)
- [SkyFi API Documentation](https://app.skyfi.com/platform-api/docs)

## Getting Help

If you encounter issues with tests:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review existing test files for patterns
3. Consult the Jest documentation
4. Reach out to the team for assistance

---

**Last Updated:** 2025-11-15
**Maintained By:** SkyFi MCP Team
