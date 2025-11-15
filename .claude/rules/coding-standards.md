# Coding Standards for SkyFi MCP

**Version:** 1.0
**Last Updated:** 2025-11-15

This document defines the coding standards and conventions for the SkyFi MCP project. All code contributions must adhere to these standards to ensure consistency, maintainability, and quality.

---

## Table of Contents

1. [TypeScript Standards](#typescript-standards)
2. [Naming Conventions](#naming-conventions)
3. [Code Organization](#code-organization)
4. [Error Handling](#error-handling)
5. [Logging](#logging)
6. [Testing](#testing)
7. [Documentation](#documentation)
8. [Security](#security)
9. [Performance](#performance)
10. [Git Workflow](#git-workflow)

---

## TypeScript Standards

### Compiler Configuration
- **Strict Mode**: Always enabled (`"strict": true`)
- **Target**: ES2022
- **Module**: ESNext with Node16 module resolution
- **No Implicit Any**: Prohibited (`"noImplicitAny": true`)
- **Unused Locals/Parameters**: Error on unused (`"noUnusedLocals": true`, `"noUnusedParameters": true`)

### Type Safety
- **No `any` types** without explicit justification in comments
- **Use strict null checks** - handle undefined/null explicitly
- **Prefer interfaces** over type aliases for object shapes
- **Use type guards** for runtime type validation
- **Use const assertions** where appropriate (`as const`)

**Good:**
```typescript
interface ArchiveSearchParams {
  aoi: string;
  fromDate: string;
  toDate: string;
  productTypes?: ProductType[];
}

function searchArchives(params: ArchiveSearchParams): Promise<ArchiveResponse> {
  // Implementation
}
```

**Bad:**
```typescript
function searchArchives(params: any): any {
  // Implementation
}
```

### Type Inference
- Let TypeScript infer return types when obvious
- **Explicitly type** function parameters
- **Explicitly type** public API return types
- **Let inference work** for internal variables

**Good:**
```typescript
function calculateArea(width: number, height: number): number {
  const area = width * height; // Type inferred as number
  return area;
}
```

### Null Safety
- Use `??` (nullish coalescing) instead of `||` when checking for null/undefined
- Use optional chaining `?.` for safe property access
- Avoid `!` (non-null assertion) unless absolutely necessary with justification

**Good:**
```typescript
const apiKey = process.env.SKYFI_API_KEY ?? '';
const orderId = order?.id;
```

**Bad:**
```typescript
const apiKey = process.env.SKYFI_API_KEY || '';
const orderId = order!.id; // Dangerous without justification
```

---

## Naming Conventions

### Files and Directories
- **Kebab-case** for file names: `archive-search.ts`, `skyfi-client.ts`
- **Kebab-case** for directories: `src/mcp/tools/`, `src/skyfi/`
- **Test files**: Same name as source with `.test.ts` or `.integration.test.ts`
- **Type files**: `*.types.ts` for type-only modules

### Variables and Functions
- **camelCase** for variables and functions: `archiveSearch`, `getUserById`
- **UPPER_SNAKE_CASE** for constants: `MAX_RETRY_ATTEMPTS`, `API_BASE_URL`
- **Boolean variables**: Prefix with `is`, `has`, `should`: `isValid`, `hasPermission`, `shouldRetry`

**Good:**
```typescript
const MAX_RETRIES = 3;
const isValid = validateInput(data);

async function fetchOrderById(orderId: string): Promise<Order> {
  // Implementation
}
```

### Classes and Interfaces
- **PascalCase** for classes, interfaces, types, enums: `SkyFiClient`, `ArchiveSearchParams`
- **Interfaces**: No `I` prefix (use descriptive names)
- **Enums**: Singular name, PascalCase members

**Good:**
```typescript
interface ArchiveSearchParams {
  aoi: string;
  fromDate: string;
}

enum ProductType {
  Day = 'DAY',
  Multispectral = 'MULTISPECTRAL',
  SAR = 'SAR',
}

class SkyFiClient {
  // Implementation
}
```

**Bad:**
```typescript
interface IArchiveSearchParams { } // Don't use I prefix
enum productType { } // Wrong casing
```

### Functions
- **Verb-based names** for functions: `fetchData`, `validateInput`, `transformResponse`
- **Noun-based names** for getters: `userId`, `orderStatus`
- **Async functions**: No special naming (TypeScript shows `Promise<T>` return type)

---

## Code Organization

### Module Structure
```
src/
├── index.ts                 # Main entry point
├── mcp/                     # MCP server and tools
│   ├── server.ts
│   ├── transport.ts
│   ├── tools/               # Individual MCP tool implementations
│   └── schemas/             # MCP tool input schemas
├── skyfi/                   # SkyFi API client
│   ├── client.ts            # Base HTTP client
│   ├── archives.ts          # Archive search methods
│   ├── orders.ts            # Order placement methods
│   └── ...
├── agent/                   # Demo agent
│   ├── agent.ts
│   ├── openai-client.ts
│   └── ...
├── db/                      # Database (caching layer)
│   ├── client.ts
│   ├── schema.ts
│   └── cache/
├── lib/                     # Shared utilities
│   ├── logger.ts
│   ├── errors.ts
│   ├── retry.ts
│   └── ...
├── types/                   # Type definitions
│   ├── skyfi-api.ts
│   ├── mcp.ts
│   └── ...
└── schemas/                 # Zod validation schemas
    └── skyfi.schemas.ts
```

### Import Organization
Order imports as follows:
1. External dependencies (Node.js built-ins)
2. External dependencies (npm packages)
3. Internal absolute imports
4. Internal relative imports

**Good:**
```typescript
// Node.js built-ins
import { readFile } from 'fs/promises';

// External packages
import axios from 'axios';
import { z } from 'zod';

// Internal absolute imports
import { logger } from '@/lib/logger';
import type { ArchiveSearchParams } from '@/types/archives';

// Internal relative imports
import { validateAOI } from './validators';
```

### Barrel Exports
- Use `index.ts` for public API exports in modules
- Keep internal implementation files private

**src/skyfi/index.ts:**
```typescript
export { SkyFiClient } from './client';
export { searchArchives, getArchiveById } from './archives';
export * from './types';
```

---

## Error Handling

### Custom Error Classes
- Create custom error classes extending `Error`
- Include context-specific information
- Use error codes for categorization

**lib/errors.ts:**
```typescript
export class SkyFiAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
  ) {
    super(message);
    this.name = 'SkyFiAPIError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Error Handling Patterns
- **Always catch** and handle errors appropriately
- **Never swallow** errors silently
- **Log errors** with context before rethrowing
- **Use type guards** to check error types

**Good:**
```typescript
async function fetchOrder(orderId: string): Promise<Order> {
  try {
    const response = await axios.get(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Failed to fetch order', { orderId, status: error.response?.status });
      throw new SkyFiAPIError(
        `Failed to fetch order ${orderId}`,
        error.response?.status ?? 500,
      );
    }
    logger.error('Unexpected error fetching order', { orderId, error });
    throw error;
  }
}
```

### Validation Errors
- Use Zod for runtime validation
- Provide clear, actionable error messages
- Include field names in validation errors

**Good:**
```typescript
const ArchiveSearchSchema = z.object({
  aoi: z.string().refine(isValidWKT, 'AOI must be valid WKT polygon'),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
});

try {
  const params = ArchiveSearchSchema.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    throw new ValidationError(
      `Invalid search parameters: ${error.errors.map(e => e.message).join(', ')}`,
    );
  }
}
```

---

## Logging

### Structured Logging
- Use Winston for all logging
- Always use structured (JSON) format in production
- Include correlation IDs for request tracing

**lib/logger.ts:**
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
```

### Log Levels
- **DEBUG**: Detailed debugging information
- **INFO**: General informational messages
- **WARN**: Warning messages (recoverable issues)
- **ERROR**: Error messages (unrecoverable issues)

### What to Log
**DO log:**
- Request/response metadata (method, URL, status, duration)
- Errors with full context
- Important state changes (order placed, cache hit/miss)
- Performance metrics (operation duration)

**DON'T log:**
- API keys or credentials
- Full request/response bodies (may contain sensitive data)
- User passwords or payment information
- Delivery credentials (AWS keys, etc.)

**Good:**
```typescript
logger.info('Archive search completed', {
  correlationId,
  aoi: params.aoi.substring(0, 50) + '...', // Truncate for readability
  resultCount: results.length,
  durationMs,
});

logger.error('Order placement failed', {
  correlationId,
  orderId,
  errorCode: error.code,
  message: error.message,
});
```

**Bad:**
```typescript
logger.debug('Request details', {
  apiKey: process.env.SKYFI_API_KEY, // NEVER LOG SECRETS
  deliveryParams: params.deliveryParams, // May contain credentials
});
```

---

## Testing

### Test Coverage
- **Minimum 80% coverage** for all code
- **100% coverage** for critical paths (order placement, payment flows)
- Use Jest for testing framework

### Test Organization
```
__tests__/
├── unit/
│   ├── skyfi/
│   ├── mcp/
│   └── lib/
├── integration/
│   ├── skyfi-client.integration.test.ts
│   └── mcp-tools.integration.test.ts
└── e2e/
    └── agent.e2e.test.ts
```

### Test Naming
- **Describe blocks**: Use descriptive names with component/function being tested
- **Test cases**: Use "should" statements describing expected behavior

**Good:**
```typescript
describe('SkyFiClient', () => {
  describe('searchArchives', () => {
    it('should return archive results for valid parameters', async () => {
      // Test implementation
    });

    it('should throw ValidationError for invalid AOI', async () => {
      // Test implementation
    });

    it('should retry on transient API errors', async () => {
      // Test implementation
    });
  });
});
```

### Test Patterns
- **AAA pattern**: Arrange, Act, Assert
- **Mock external dependencies**: Use jest.mock() for external APIs
- **Use test fixtures**: Keep test data in separate files
- **Test error paths**: Don't just test happy paths

**Good:**
```typescript
it('should retry on 429 rate limit errors', async () => {
  // Arrange
  const mockAxios = jest.spyOn(axios, 'get')
    .mockRejectedValueOnce({ response: { status: 429 } })
    .mockResolvedValueOnce({ data: mockArchiveData });

  // Act
  const result = await searchArchives(validParams);

  // Assert
  expect(mockAxios).toHaveBeenCalledTimes(2);
  expect(result).toEqual(mockArchiveData);
});
```

### Integration Tests
- Test against mock APIs (not live services)
- Use high-fidelity mocks based on real API responses
- Run separately from unit tests

### Test Utilities
- Create helper functions for common test setup
- Use factories for test data generation

---

## Documentation

### JSDoc Comments
- **Required** for all public APIs (exported functions, classes, interfaces)
- Include `@param`, `@returns`, `@throws` where applicable
- Provide examples for complex APIs

**Good:**
```typescript
/**
 * Search SkyFi's archive catalog for satellite imagery.
 *
 * @param params - Search parameters including AOI, date range, and filters
 * @returns Promise resolving to archive search results
 * @throws {ValidationError} If search parameters are invalid
 * @throws {SkyFiAPIError} If API request fails
 *
 * @example
 * ```typescript
 * const results = await searchArchives({
 *   aoi: 'POLYGON((-97.72 30.28, ...))',
 *   fromDate: '2025-01-01T00:00:00Z',
 *   toDate: '2025-01-31T23:59:59Z',
 *   productTypes: [ProductType.Day],
 *   resolution: Resolution.High,
 * });
 * ```
 */
export async function searchArchives(
  params: ArchiveSearchParams,
): Promise<ArchiveResponse> {
  // Implementation
}
```

### Inline Comments
- Use sparingly - code should be self-explanatory
- Explain **why**, not **what**
- Document complex algorithms or non-obvious logic
- Use `TODO`, `FIXME`, `NOTE` prefixes appropriately

**Good:**
```typescript
// Retry with exponential backoff to avoid overwhelming the API
// during transient outages
const result = await retryWithBackoff(apiCall, MAX_RETRIES);

// TODO(PR-030): Replace with cached lookup once caching layer is implemented
const order = await fetchOrderFromAPI(orderId);
```

**Bad:**
```typescript
// Increment counter by 1
counter++;

// Call the search function
searchArchives(params);
```

### README Files
- Every major module should have a README.md
- Include purpose, usage examples, and API overview

---

## Security

### Secrets Management
- **Never hardcode** secrets, API keys, or credentials
- Use environment variables for all secrets
- Use AWS Secrets Manager for production deployment
- Provide `.env.example` with dummy values

**Good:**
```typescript
const apiKey = process.env.SKYFI_API_KEY;
if (!apiKey) {
  throw new Error('SKYFI_API_KEY environment variable is required');
}
```

**Bad:**
```typescript
const apiKey = 'sk_live_abc123...'; // NEVER DO THIS
```

### Input Validation
- **Always validate** user input
- Use Zod schemas for runtime validation
- Sanitize inputs before using in queries or commands
- Validate AOI polygons to prevent injection attacks

### Data Handling
- **Never log** API keys, passwords, or credentials
- **Mask sensitive data** in error messages
- Use HTTPS for all external communication
- Validate delivery credentials before storing

### Dependencies
- Keep dependencies up-to-date
- Run `npm audit` regularly
- Review security advisories
- Pin dependency versions in package.json

---

## Performance

### Caching
- Cache frequently accessed data (archive searches, orders)
- Use TTL for cache expiration
- Implement cache-aside pattern

### Database Queries
- Use connection pooling
- Create indexes for frequently queried fields
- Limit result sets with pagination

### API Calls
- Implement rate limiting to respect API limits
- Use retry logic with exponential backoff
- Batch requests when possible
- Implement request timeout (default 30s)

### Async/Await
- Use async/await for all asynchronous operations
- Avoid blocking operations in request handlers
- Use Promise.all() for parallel operations

**Good:**
```typescript
// Parallel execution
const [archives, orders, notifications] = await Promise.all([
  searchArchives(params),
  listOrders(filter),
  listNotifications(),
]);
```

**Bad:**
```typescript
// Sequential execution (slower)
const archives = await searchArchives(params);
const orders = await listOrders(filter);
const notifications = await listNotifications();
```

---

## Git Workflow

### Commit Messages
Follow Conventional Commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements

**Examples:**
```
feat(mcp): add archive search MCP tool

Implements the archive search tool for MCP server with input
validation and result formatting.

Closes PR-014
```

```
fix(skyfi): handle 429 rate limit errors with retry

Added exponential backoff retry logic for rate limit errors.
```

### Branch Naming
- Use descriptive branch names: `feature/archive-search`, `fix/retry-logic`
- For PRs from task list: `pr-014-archive-search-tool`

### Pull Requests
- Reference PR number from task list in commits
- Keep PRs focused (single responsibility)
- Include tests with all PRs
- Update documentation if behavior changes

---

## Tools and Automation

### Linting
- **ESLint** with Airbnb config
- Run on pre-commit hook
- Zero warnings policy for production code

### Formatting
- **Prettier** for code formatting
- Run on pre-commit hook
- Configuration:
  - 2 space indentation
  - Single quotes
  - Trailing commas
  - Print width: 100

### Pre-commit Hooks
Use Husky + lint-staged for:
- ESLint on staged files
- Prettier on staged files
- TypeScript type checking
- Running relevant tests

---

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Effective TypeScript](https://effectivetypescript.com/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Zod Documentation](https://zod.dev/)
- [Winston Documentation](https://github.com/winstonjs/winston)

---

**Last Updated:** 2025-11-15
**Version:** 1.0
