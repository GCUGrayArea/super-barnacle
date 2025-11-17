# Local Development Guide

This guide covers the development workflow, best practices, and tips for working on the SkyFi MCP server.

## Table of Contents

- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Running the Server](#running-the-server)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Database Management](#database-management)
- [Debugging](#debugging)
- [Common Development Tasks](#common-development-tasks)
- [Project Structure](#project-structure)
- [Best Practices](#best-practices)

## Development Setup

### Initial Setup

```bash
# Clone and install dependencies
git clone https://github.com/your-org/skyfi-mcp.git
cd skyfi-mcp
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Start database
docker-compose up -d postgres

# Run migrations
npm run migrate:up
```

### Editor Setup

#### VS Code (Recommended)

Install recommended extensions:
- ESLint
- Prettier
- TypeScript
- Docker

Workspace settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

#### Vim/Neovim

Use ALE or CoC for TypeScript support:
```vim
" .vimrc
let g:ale_fixers = {
\   'typescript': ['prettier', 'eslint'],
\}
let g:ale_fix_on_save = 1
```

## Development Workflow

### 1. Start Development Environment

```bash
# Terminal 1: Start PostgreSQL
docker-compose up -d postgres

# Terminal 2: Start MCP server with hot reload
npm run dev

# Terminal 3: Watch TypeScript compilation
npm run build:watch

# Optional - Terminal 4: Run tests in watch mode
npm run test:watch
```

### 2. Make Changes

```bash
# Create a feature branch
git checkout -b feature/my-new-feature

# Make your changes
# The server will automatically reload thanks to tsx watch
```

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test file
npm test -- search-archives.test.ts

# Run integration tests
npm run test:integration

# Check coverage
npm run test:coverage
```

### 4. Code Quality Checks

```bash
# Lint and fix
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit (husky will run pre-commit hooks)
git commit -m "feat: add new feature"

# Pre-commit hooks will:
# - Run ESLint
# - Run Prettier
# - Run type checking
```

## Running the Server

### Development Mode (Hot Reload)

```bash
npm run dev
```

Features:
- Automatic restart on file changes
- Detailed logging (debug level)
- Source maps for debugging
- No build step required

### Watch Mode (Manual Restart)

```bash
# Terminal 1: Watch TypeScript compilation
npm run build:watch

# Terminal 2: Manually restart when needed
npm start
```

### Production Mode

```bash
# Build first
npm run build

# Run production build
npm run start
```

### Using Docker Compose

```bash
# Start all services
docker-compose up

# Rebuild after code changes
docker-compose up --build

# View logs
docker-compose logs -f mcp-server

# Stop services
docker-compose down
```

## Testing

### Unit Tests

Test individual functions and modules:

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/mcp/tools/search-archives.test.ts

# Watch mode
npm run test:watch
```

Example unit test:
```typescript
// __tests__/unit/tools/search-archives.test.ts
import { searchArchives } from '../../../src/mcp/tools/search-archives.js';

describe('searchArchives', () => {
  it('should validate AOI polygon', async () => {
    const invalidAOI = 'INVALID_WKT';

    await expect(
      searchArchives({ aoi: invalidAOI })
    ).rejects.toThrow('Invalid WKT format');
  });
});
```

### Integration Tests

Test integration between components:

```bash
# Run integration tests
npm run test:integration

# Watch mode
npm run test:integration:watch

# With coverage
npm run test:integration:coverage
```

Example integration test:
```typescript
// __tests__/integration/mcp-server.test.ts
import { SkyFiMCPServer } from '../../src/mcp/server.js';

describe('MCP Server Integration', () => {
  let server: SkyFiMCPServer;

  beforeAll(async () => {
    server = new SkyFiMCPServer(config);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should list all tools', async () => {
    const tools = await server.listTools();
    expect(tools).toHaveLength(13);
  });
});
```

### End-to-End Tests

Test complete workflows:

```bash
# Run E2E tests (requires running server)
npm run test:e2e
```

Example E2E test:
```typescript
// __tests__/e2e/order-workflow.test.ts
describe('Complete Order Workflow', () => {
  it('should search, price, and order imagery', async () => {
    // Search archives
    const searchResult = await client.callTool({
      name: 'search_archives',
      arguments: { aoi, start_date, end_date }
    });

    // Get pricing
    const pricing = await client.callTool({
      name: 'get_pricing',
      arguments: { product_type: 'DAY', resolution: 'HIGH' }
    });

    // Place order
    const order = await client.callTool({
      name: 'order_archive',
      arguments: { archive_id, delivery }
    });

    expect(order).toBeDefined();
  });
});
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

Coverage goals:
- Overall: >80%
- Critical paths: >90%
- Tools: 100%

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint:fix

# Check specific file
npx eslint src/mcp/server.ts
```

ESLint configuration (`.eslintrc.cjs`):
```javascript
module.exports = {
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  rules: {
    // Custom rules
  }
};
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting
npm run format:check

# Format specific files
npx prettier --write src/mcp/server.ts
```

Prettier configuration (`.prettierrc`):
```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Type Checking

```bash
# Run TypeScript compiler (no emit)
npm run typecheck

# Watch mode
npx tsc --noEmit --watch
```

## Database Management

### Migrations

```bash
# Create a new migration
npm run migrate:create -- my_migration_name

# Run all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check migration status
npm run migrate:status
```

Migration structure:
```sql
-- migrations/003_my_migration.sql
BEGIN;

-- Your migration SQL here
CREATE TABLE my_table (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;
```

### Database Reset

```bash
# Drop and recreate database
docker-compose down -v
docker-compose up -d postgres
npm run migrate:up
```

### Using pgAdmin

```bash
# Start pgAdmin
docker-compose --profile tools up -d pgadmin

# Access at http://localhost:5050
# Login: admin@skyfi.local / admin
```

Add server in pgAdmin:
- Host: `postgres`
- Port: `5432`
- Database: `skyfi_mcp`
- Username: `skyfi`
- Password: (from POSTGRES_PASSWORD in .env)

### Direct Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U skyfi -d skyfi_mcp

# List tables
\dt

# View cache entries
SELECT * FROM cache LIMIT 10;

# Check cache statistics
SELECT
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as valid_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries
FROM cache;
```

## Debugging

### VS Code Debugger

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["--loader", "tsx"],
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Logging

Enable debug logging:
```bash
# In .env
LOG_LEVEL=debug

# Or temporarily
LOG_LEVEL=debug npm run dev
```

Add debug logs in code:
```typescript
import { logger } from './lib/logger.js';

logger.debug('Detailed information', {
  request: req.body,
  metadata: { timestamp: Date.now() }
});
```

### Network Debugging

Monitor HTTP requests:
```bash
# Using curl with verbose output
curl -v http://localhost:3000/health

# Using httpie
http --verbose localhost:3000/health

# Monitor all requests
docker-compose logs -f mcp-server | grep "HTTP"
```

### Database Query Debugging

Enable PostgreSQL query logging:
```bash
# In docker-compose.yml, add to postgres service:
command: postgres -c log_statement=all

# Restart and view logs
docker-compose restart postgres
docker-compose logs -f postgres
```

## Common Development Tasks

### Adding a New MCP Tool

1. Create tool file:
```bash
# Create new tool
touch src/mcp/tools/my-new-tool.ts
```

2. Implement tool:
```typescript
// src/mcp/tools/my-new-tool.ts
import { z } from 'zod';

export const MyNewToolSchema = z.object({
  param1: z.string(),
  param2: z.number().optional(),
});

export async function myNewTool(args: z.infer<typeof MyNewToolSchema>) {
  // Implementation
}
```

3. Register in server:
```typescript
// src/mcp/server.ts
import { myNewTool, MyNewToolSchema } from './tools/my-new-tool.js';

// In registerTools()
server.tool('my_new_tool', MyNewToolSchema, myNewTool);
```

4. Add tests:
```typescript
// __tests__/unit/tools/my-new-tool.test.ts
describe('myNewTool', () => {
  it('should do something', async () => {
    // Test implementation
  });
});
```

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all dependencies
npm update

# Update specific package
npm update axios

# Update to latest (including majors)
npx npm-check-updates -u
npm install
```

### Performance Profiling

```bash
# Run with Node.js profiler
node --prof dist/index.js

# Process profile
node --prof-process isolate-*.log > processed.txt

# Use clinic.js for detailed profiling
npx clinic doctor -- node dist/index.js
```

### Memory Leak Detection

```bash
# Monitor memory usage
node --inspect dist/index.js

# Open Chrome DevTools: chrome://inspect
# Take heap snapshots and compare
```

## Project Structure

```
skyfi-mcp/
├── src/
│   ├── index.ts              # Main entry point
│   ├── mcp/                  # MCP server implementation
│   │   ├── server.ts         # MCP server core
│   │   ├── config.ts         # MCP configuration
│   │   ├── tools/            # Tool implementations
│   │   ├── schemas/          # Zod schemas
│   │   └── formatters/       # Response formatters
│   ├── agent/                # Demo agent
│   │   ├── agent.ts          # Main agent logic
│   │   ├── prompts.ts        # System prompts
│   │   ├── conversation.ts   # Conversation management
│   │   └── tool-executor.ts  # Tool execution
│   ├── skyfi/                # SkyFi API client
│   │   └── client.ts         # API wrapper
│   ├── db/                   # Database layer
│   │   ├── client.ts         # PostgreSQL client
│   │   └── migrations.ts     # Migration runner
│   ├── lib/                  # Shared utilities
│   │   └── logger.ts         # Winston logger
│   └── types/                # TypeScript types
├── __tests__/                # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
├── infrastructure/           # Deployment configs
├── docs/                     # Documentation
└── migrations/               # SQL migrations
```

## Best Practices

### TypeScript

```typescript
// Use strict typing
const user: User = { id: 1, name: 'Alice' };

// Avoid 'any'
const data: unknown = JSON.parse(str);
if (isUser(data)) {
  // Now TypeScript knows data is User
}

// Use type guards
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

// Prefer interfaces for objects
interface Config {
  port: number;
  host: string;
}

// Use enums for constants
enum Resolution {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}
```

### Error Handling

```typescript
// Use custom error types
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Handle errors appropriately
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Validation failed', { error: error.message });
    return { success: false, error: error.message };
  }

  logger.error('Unexpected error', { error });
  throw error;
}
```

### Async/Await

```typescript
// Always handle promises
await asyncOperation();  // Good

asyncOperation();  // Bad - unhandled promise

// Use Promise.all for parallel operations
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
]);

// Handle errors in parallel operations
const results = await Promise.allSettled([
  operation1(),
  operation2(),
]);
```

### Logging

```typescript
// Use appropriate log levels
logger.error('Critical error', { error });
logger.warn('Warning condition', { details });
logger.info('Important event', { event });
logger.debug('Debug information', { data });

// Include context
logger.info('User action', {
  userId: user.id,
  action: 'order_placed',
  orderId: order.id,
});

// Don't log sensitive data
logger.info('User login', {
  userId: user.id,
  // Don't log: password, apiKey, etc.
});
```

### Testing

```typescript
// Describe what, not how
it('should return 404 for non-existent user', async () => {
  // Test implementation
});

// Use arrange-act-assert pattern
it('should create order', async () => {
  // Arrange
  const orderData = { product: 'DAY', resolution: 'HIGH' };

  // Act
  const result = await createOrder(orderData);

  // Assert
  expect(result.id).toBeDefined();
  expect(result.status).toBe('pending');
});

// Mock external dependencies
jest.mock('../src/skyfi/client.ts', () => ({
  SkyFiClient: jest.fn().mockImplementation(() => ({
    searchArchives: jest.fn().mockResolvedValue([]),
  })),
}));
```

## Tips and Tricks

### Hot Reload Not Working

```bash
# Ensure tsx is watching correctly
npm run dev

# Or use nodemon
npx nodemon --exec tsx src/index.ts
```

### Speed Up Tests

```bash
# Run tests in parallel
npm test -- --maxWorkers=4

# Only run changed tests
npm test -- --onlyChanged

# Run specific test suite
npm test -- --testPathPattern=search
```

### Quick Type Checking

```bash
# Add to package.json scripts
"check": "npm run typecheck && npm run lint && npm test"

# Run before commit
npm run check
```

### Database Seeding

```bash
# Create seed script
npm run seed

# Implementation in scripts/seed.ts
import { db } from '../src/db/client.js';

async function seed() {
  await db.query(`
    INSERT INTO cache (key, value, expires_at)
    VALUES ('test', '{}', NOW() + INTERVAL '1 day')
  `);
}
```

---

[← Back to Configuration](configuration.md) | [Next: Deployment Guide →](deployment.md)
