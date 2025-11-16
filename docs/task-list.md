# Task List for SkyFi MCP

**Project:** SkyFi Model Context Protocol Server and Demo Agent
**Last Updated:** 2025-11-16
**Total PRs:** 35 organized into 11 dependency blocks (27 Complete, 8 Remaining)

---

## Block 1: Foundation (No dependencies)

### PR-001: Project Setup and Configuration
**Status:** Complete ✅
**Dependencies:** None
**Priority:** High

**Description:**
Initialize the TypeScript Node.js project with all necessary build tools, testing infrastructure, and dependency management. This establishes the foundation for all subsequent development work.

**Files (ESTIMATED - will be refined during Planning):**
- package.json (create) - Project dependencies and scripts
- tsconfig.json (create) - TypeScript compiler configuration
- .eslintrc.js (create) - ESLint rules (Airbnb config)
- .prettierrc (create) - Code formatting rules
- jest.config.js (create) - Testing framework configuration
- .nvmrc (create) - Node.js version specification (20.x LTS)
- src/index.ts (create) - Placeholder entry point
- __tests__/setup.ts (create) - Test environment setup

**Acceptance Criteria:**
- [ ] package.json with all core dependencies (@modelcontextprotocol/sdk, openai, zod, axios, winston, dotenv)
- [ ] TypeScript compiles successfully with strict mode enabled
- [ ] ESLint runs without errors on sample code
- [ ] Prettier formats code correctly
- [ ] Jest test runner executes successfully
- [ ] npm scripts for build, test, lint, format are working

**Notes:**
This PR sets up the development environment. Choose conservative, well-tested versions for all dependencies.

---

### PR-002: Docker Configuration
**Status:** Complete ✅
**Dependencies:** None
**Priority:** High

**Description:**
Create multi-stage Dockerfile for building optimized production images, plus docker-compose for local development with Postgres (for P1 caching).

**Files (ESTIMATED - will be refined during Planning):**
- Dockerfile (create) - Multi-stage build for production
- .dockerignore (create) - Exclude unnecessary files from build context
- docker-compose.yml (create) - Local development environment with Postgres
- docker-compose.prod.yml (create) - Production-like local testing

**Acceptance Criteria:**
- [ ] Dockerfile builds successfully with multi-stage optimization
- [ ] Production image size <200MB
- [ ] docker-compose.yml starts MCP server and Postgres
- [ ] Health check defined in Dockerfile
- [ ] Non-root user for security
- [ ] Build time <5 minutes

**Notes:**
Use Alpine-based Node.js images for smaller size. Ensure build cache optimization for faster rebuilds.

---

### PR-003: Coding Standards Document
**Status:** Complete ✅
**Dependencies:** None
**Priority:** Medium

**Description:**
Create comprehensive coding standards document to ensure consistency across all development work.

**Files (ESTIMATED - will be refined during Planning):**
- .claude/rules/coding-standards.md (create) - Coding standards and conventions
- .claude/rules/agent-defaults.md (create) - Agent workflow and PR state model

**Acceptance Criteria:**
- [ ] TypeScript style guide defined
- [ ] Naming conventions documented
- [ ] Comment and documentation standards specified
- [ ] Error handling patterns defined
- [ ] Testing standards outlined
- [ ] PR state model documented

**Notes:**
This document will be referenced by all subsequent PRs. Keep it concise but comprehensive.

---

## Block 2: Core Infrastructure (Depends on: Block 1)

### PR-004: Logging and Error Handling Infrastructure
**Status:** Complete ✅
**Dependencies:** PR-001
**Priority:** High

**Description:**
Set up structured logging with Winston and create standardized error handling patterns that will be used throughout the application.

**Files (ESTIMATED - will be refined during Planning):**
- src/lib/logger.ts (create) - Winston logger configuration
- src/lib/errors.ts (create) - Custom error classes (SkyFiAPIError, ValidationError, etc.)
- src/lib/error-handler.ts (create) - Centralized error handling middleware
- src/types/logging.ts (create) - Logging type definitions
- __tests__/lib/logger.test.ts (create) - Logger unit tests
- __tests__/lib/errors.test.ts (create) - Error handling unit tests

**Acceptance Criteria:**
- [ ] Winston logger configured with JSON format
- [ ] Log levels: DEBUG, INFO, WARN, ERROR
- [ ] Correlation ID support for request tracing
- [ ] Custom error classes with proper inheritance
- [ ] Error handler never logs sensitive data (API keys, credentials)
- [ ] Tests verify logging behavior
- [ ] Tests verify error handling patterns

**Notes:**
All subsequent PRs will use this logging infrastructure. Ensure it's robust and well-tested.

---

### PR-005: SkyFi API Client Base
**Status:** Complete ✅
**Dependencies:** PR-001, PR-004
**Priority:** High

**Description:**
Create the foundational HTTP client for SkyFi API with authentication, request/response handling, rate limiting, and retry logic.

**Files (ESTIMATED - will be refined during Planning):**
- src/skyfi/client.ts (create) - Base HTTP client with authentication
- src/skyfi/config.ts (create) - SkyFi API configuration
- src/lib/retry.ts (create) - Retry logic with exponential backoff
- src/lib/rate-limiter.ts (create) - Rate limiting logic
- src/types/skyfi-base.ts (create) - Base type definitions
- __tests__/skyfi/client.test.ts (create) - Client unit tests
- __tests__/lib/retry.test.ts (create) - Retry logic tests

**Acceptance Criteria:**
- [ ] Axios client configured with base URL and authentication header
- [ ] API key loaded from environment variable (SKYFI_API_KEY)
- [ ] Retry logic with exponential backoff (max 3 retries)
- [ ] Rate limiting to respect SkyFi API limits
- [ ] Request/response interceptors for logging
- [ ] Never log API keys or sensitive credentials
- [ ] Comprehensive error handling with custom error types
- [ ] Tests cover authentication, retry, and error scenarios

**Notes:**
This is critical infrastructure. All SkyFi API interactions will use this client.

---

### PR-006: Type Definitions from OpenAPI Schema
**Status:** Complete ✅
**Dependencies:** PR-001
**Priority:** High

**Description:**
Generate TypeScript type definitions from the SkyFi OpenAPI spec, with Zod schemas for runtime validation.

**Files (ESTIMATED - will be refined during Planning):**
- src/types/skyfi-api.ts (create) - Generated TypeScript types from OpenAPI
- src/schemas/skyfi.schemas.ts (create) - Zod validation schemas
- scripts/generate-types.ts (create) - Script to generate types from OpenAPI
- __tests__/schemas/skyfi.schemas.test.ts (create) - Schema validation tests

**Acceptance Criteria:**
- [ ] All SkyFi API request/response types defined
- [ ] Zod schemas for runtime validation of API responses
- [ ] Type-safe enums for ProductType, Resolution, DeliveryDriver, etc.
- [ ] Script to regenerate types from updated OpenAPI spec
- [ ] 100% type coverage (no `any` types)
- [ ] Tests verify schema validation works correctly

**Notes:**
Consider using openapi-typescript or similar tool for generation. Ensure types match docs/openapi.json exactly.

---

## Block 3: SkyFi API Client Implementation (Depends on: Block 2)

### PR-007: Archive Search Implementation
**Status:** Complete ✅
**Dependencies:** PR-005, PR-006
**Priority:** High

**Description:**
Implement archive search functionality to query SkyFi's satellite imagery catalog with filtering by AOI, date range, product type, resolution, and cloud coverage.

**Files (ESTIMATED - will be refined during Planning):**
- src/skyfi/archives.ts (create) - Archive search methods
- src/types/archives.ts (create) - Archive-specific types
- src/schemas/archives.schemas.ts (create) - Archive validation schemas
- __tests__/skyfi/archives.test.ts (create) - Archive search unit tests
- __tests__/skyfi/archives.integration.test.ts (create) - Integration tests with mock API

**Acceptance Criteria:**
- [ ] `searchArchives()` method implemented
- [ ] `getArchiveById()` method implemented
- [ ] AOI validation (WKT format, max 500 vertices, max 500k sqkm)
- [ ] Date range validation (ISO 8601 format)
- [ ] Product type and resolution filtering
- [ ] Cloud coverage filtering
- [ ] Open data filtering support
- [ ] Response parsing and type validation
- [ ] Comprehensive error handling
- [ ] Unit tests >80% coverage
- [ ] Integration tests with mocked API responses

**Notes:**
Archive search is the starting point for most workflows. Ensure robust validation and clear error messages.

---

### PR-008: Order Placement Implementation
**Status:** Complete ✅
**Dependencies:** PR-005, PR-006
**Priority:** High

**Description:**
Implement order placement for both archive and tasking imagery, including delivery configuration validation for S3, GCS, and Azure.

**Files (ESTIMATED - will be refined during Planning):**
- src/skyfi/orders.ts (create) - Order placement methods
- src/types/orders.ts (create) - Order-specific types
- src/schemas/orders.schemas.ts (create) - Order validation schemas
- src/lib/delivery-validator.ts (create) - Delivery configuration validation
- __tests__/skyfi/orders.test.ts (create) - Order placement unit tests
- __tests__/lib/delivery-validator.test.ts (create) - Delivery validation tests
- __tests__/skyfi/orders.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] `placeArchiveOrder()` method implemented
- [ ] `placeTaskingOrder()` method implemented
- [ ] Delivery driver validation (S3, GS, AZURE)
- [ ] Delivery parameters validation for each driver
- [ ] AOI validation for orders
- [ ] Webhook URL validation (optional)
- [ ] Response parsing and type validation
- [ ] Clear error messages for validation failures
- [ ] Unit tests >80% coverage
- [ ] Integration tests with mocked API responses

**Notes:**
Order placement involves payment. Ensure validation is extremely robust to prevent costly mistakes.

---

### PR-009: Feasibility and Pass Prediction Implementation
**Status:** Complete ✅
**Dependencies:** PR-005, PR-006
**Priority:** High

**Description:**
Implement feasibility checking and satellite pass prediction to help users determine if tasking orders can be fulfilled and when satellites will be overhead.

**Files (ESTIMATED - will be refined during Planning):**
- src/skyfi/feasibility.ts (create) - Feasibility check methods
- src/types/feasibility.ts (create) - Feasibility-specific types
- src/schemas/feasibility.schemas.ts (create) - Feasibility validation schemas
- __tests__/skyfi/feasibility.test.ts (create) - Feasibility unit tests
- __tests__/skyfi/feasibility.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] `checkFeasibility()` method implemented
- [ ] `predictPasses()` method implemented
- [ ] `getFeasibilityById()` method implemented
- [ ] AOI and time window validation
- [ ] Product type and resolution filtering
- [ ] Provider filtering (PLANET, UMBRA, etc.)
- [ ] Pass opportunity parsing (with provider_window_id for Planet)
- [ ] Feasibility score interpretation
- [ ] Response parsing and type validation
- [ ] Unit tests >80% coverage
- [ ] Integration tests with mocked API responses

**Notes:**
Pass prediction is key for tasking orders. Ensure clear presentation of opportunities and provider_window_id support.

---

### PR-010: Order Management Implementation
**Status:** Complete ✅
**Dependencies:** PR-005, PR-006
**Priority:** High

**Description:**
Implement order management functionality to list orders, retrieve order details, check status, and trigger redelivery.

**Files (ESTIMATED - will be refined during Planning):**
- src/skyfi/order-management.ts (create) - Order management methods
- src/types/order-status.ts (create) - Order status types
- src/schemas/order-management.schemas.ts (create) - Validation schemas
- __tests__/skyfi/order-management.test.ts (create) - Unit tests
- __tests__/skyfi/order-management.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] `listOrders()` method with filtering and pagination
- [ ] `getOrderById()` method implemented
- [ ] `triggerRedelivery()` method implemented
- [ ] Order status enum and interpretation
- [ ] Order type filtering (ARCHIVE, TASKING)
- [ ] Status filtering
- [ ] Date range filtering
- [ ] Response parsing and type validation
- [ ] Unit tests >80% coverage
- [ ] Integration tests with mocked API responses

**Notes:**
Order management enables tracking of long-running tasking orders. Ensure clear status interpretation.

---

### PR-011: Notifications/Monitoring Implementation
**Status:** Complete ✅
**Dependencies:** PR-005, PR-006
**Priority:** High

**Description:**
Implement monitoring notifications to set up webhooks for new imagery alerts based on AOI and filter criteria.

**Files (ESTIMATED - will be refined during Planning):**
- src/skyfi/notifications.ts (create) - Notification methods
- src/types/notifications.ts (create) - Notification-specific types
- src/schemas/notifications.schemas.ts (create) - Notification validation schemas
- __tests__/skyfi/notifications.test.ts (create) - Unit tests
- __tests__/skyfi/notifications.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] `createNotification()` method implemented
- [ ] `listNotifications()` method implemented
- [ ] `getNotificationById()` method implemented
- [ ] `deleteNotification()` method implemented
- [ ] AOI validation for notifications (max 500k sqkm)
- [ ] Webhook URL validation
- [ ] Filter criteria validation (product type, resolution, etc.)
- [ ] Response parsing and type validation
- [ ] Unit tests >80% coverage
- [ ] Integration tests with mocked API responses

**Notes:**
Monitoring enables automated workflows. Ensure webhook URL validation is robust.

---

### PR-012: Pricing API Implementation
**Status:** Complete ✅
**Dependencies:** PR-005, PR-006
**Priority:** Medium

**Description:**
Implement pricing API to retrieve cost estimates for different product types, resolutions, and AOI sizes.

**Files (ESTIMATED - will be refined during Planning):**
- src/skyfi/pricing.ts (create) - Pricing methods
- src/types/pricing.ts (create) - Pricing-specific types
- src/schemas/pricing.schemas.ts (create) - Pricing validation schemas
- src/lib/pricing-calculator.ts (create) - Helper for cost calculations
- __tests__/skyfi/pricing.test.ts (create) - Unit tests
- __tests__/lib/pricing-calculator.test.ts (create) - Calculator tests

**Acceptance Criteria:**
- [ ] `getPricing()` method implemented
- [ ] Support for all product types and resolutions
- [ ] AOI size-based pricing calculation
- [ ] Response parsing and type validation
- [ ] Pricing calculator helper for cost estimates
- [ ] Clear presentation of pricing tiers
- [ ] Unit tests >80% coverage
- [ ] Integration tests with mocked API responses

**Notes:**
Pricing is critical for cost transparency. Ensure accurate calculations and clear presentation.

---

## Block 4: MCP Server Core (Depends on: Block 2)

### PR-013: MCP Server Setup and HTTP/SSE Transport
**Status:** Complete ✅
**Dependencies:** PR-001, PR-004
**Priority:** High

**Description:**
Set up the MCP server using @modelcontextprotocol/sdk with HTTP and Server-Sent Events transport for stateless operation.

**Files (ESTIMATED - will be refined during Planning):**
- src/mcp/server.ts (create) - MCP server initialization
- src/mcp/transport.ts (create) - HTTP/SSE transport implementation
- src/mcp/config.ts (create) - MCP server configuration
- src/index.ts (modify) - Entry point to start MCP server
- __tests__/mcp/server.test.ts (create) - Server unit tests
- __tests__/mcp/transport.test.ts (create) - Transport unit tests

**Acceptance Criteria:**
- [ ] MCP server initializes successfully
- [ ] HTTP transport working for request/response
- [ ] SSE transport working for streaming updates
- [ ] Stateless design (no session storage)
- [ ] Health check endpoint (/health)
- [ ] Graceful shutdown handling
- [ ] Environment configuration (PORT, etc.)
- [ ] Structured logging for all requests
- [ ] Unit tests >80% coverage

**Notes:**
This is the foundation for all MCP tools. Ensure HTTP/SSE transport is robust and follows MCP spec.

---

## Block 5: MCP Tools (Depends on: Block 3 + Block 4)

### PR-014: Archive Search MCP Tool
**Status:** Complete ✅
**Dependencies:** PR-007, PR-013
**Priority:** High

**Description:**
Expose archive search functionality as an MCP tool with clear input schemas and result formatting for AI agents.

**Files (ESTIMATED - will be refined during Planning):**
- src/mcp/tools/search-archives.ts (create) - Archive search MCP tool
- src/mcp/schemas/search-archives.schema.ts (create) - Input schema definition
- src/mcp/formatters/archive-results.ts (create) - Format results for AI consumption
- __tests__/mcp/tools/search-archives.test.ts (create) - Tool unit tests
- __tests__/mcp/tools/search-archives.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] MCP tool registered with clear name and description
- [ ] Input schema with Zod validation (AOI, dates, filters)
- [ ] Helpful parameter descriptions for AI agents
- [ ] Result formatting optimized for AI understanding
- [ ] Error handling with clear, actionable messages
- [ ] Examples in tool description
- [ ] Unit tests >80% coverage
- [ ] Integration tests with full MCP server

**Notes:**
This is the first MCP tool. Set a good pattern for tool definition that others can follow.

---

### PR-015: Order Placement MCP Tools
**Status:** Complete ✅
**Dependencies:** PR-008, PR-013
**Priority:** High

**Description:**
Expose order placement (archive and tasking) as MCP tools with delivery configuration and confirmation flows.

**Files (ESTIMATED - will be refined during Planning):**
- src/mcp/tools/order-archive.ts (create) - Archive order MCP tool
- src/mcp/tools/order-tasking.ts (create) - Tasking order MCP tool
- src/mcp/schemas/order.schemas.ts (create) - Order input schemas
- src/mcp/formatters/order-results.ts (create) - Format order results
- __tests__/mcp/tools/order-archive.test.ts (create) - Unit tests
- __tests__/mcp/tools/order-tasking.test.ts (create) - Unit tests
- __tests__/mcp/tools/orders.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] `order_archive_imagery` tool implemented
- [ ] `order_tasking_imagery` tool implemented
- [ ] Delivery configuration schemas for S3, GCS, Azure
- [ ] Clear validation error messages
- [ ] Confirmation prompts in tool descriptions
- [ ] Order result formatting with status and tracking info
- [ ] Unit tests >80% coverage
- [ ] Integration tests with full MCP server

**Notes:**
Order placement involves costs. Ensure validation is extremely clear and errors are actionable.

---

### PR-016: Feasibility Checking MCP Tools
**Status:** Complete ✅
**Dependencies:** PR-009, PR-013
**Priority:** High

**Description:**
Expose feasibility checking and pass prediction as MCP tools to help agents determine if tasking orders are viable.

**Files (ESTIMATED - will be refined during Planning):**
- src/mcp/tools/check-feasibility.ts (create) - Feasibility check MCP tool
- src/mcp/tools/predict-passes.ts (create) - Pass prediction MCP tool
- src/mcp/schemas/feasibility.schemas.ts (create) - Input schemas
- src/mcp/formatters/feasibility-results.ts (create) - Format results
- __tests__/mcp/tools/feasibility.test.ts (create) - Unit tests
- __tests__/mcp/tools/feasibility.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] `check_feasibility` tool implemented
- [ ] `predict_satellite_passes` tool implemented
- [ ] Clear presentation of feasibility scores
- [ ] Pass opportunities with timing and provider info
- [ ] Support for provider_window_id extraction (Planet)
- [ ] Helpful guidance on interpreting results
- [ ] Unit tests >80% coverage
- [ ] Integration tests with full MCP server

**Notes:**
Feasibility results guide ordering decisions. Ensure results are clearly formatted and actionable.

---

### PR-017: Order Management MCP Tools
**Status:** Complete ✅
**Dependencies:** PR-010, PR-013
**Priority:** High

**Description:**
Expose order management functionality as MCP tools for listing, retrieving, and monitoring orders.

**Files (ESTIMATED - will be refined during Planning):**
- src/mcp/tools/list-orders.ts (create) - List orders MCP tool
- src/mcp/tools/get-order.ts (create) - Get order details MCP tool
- src/mcp/tools/redelivery.ts (create) - Trigger redelivery MCP tool
- src/mcp/schemas/order-management.schemas.ts (create) - Input schemas
- src/mcp/formatters/order-status.ts (create) - Format order status
- __tests__/mcp/tools/order-management.test.ts (create) - Unit tests
- __tests__/mcp/tools/order-management.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] `list_orders` tool with filtering options
- [ ] `get_order_details` tool implemented
- [ ] `trigger_order_redelivery` tool implemented
- [ ] Clear order status interpretation
- [ ] Delivery status tracking
- [ ] Helpful error messages for failed orders
- [ ] Unit tests >80% coverage
- [ ] Integration tests with full MCP server

**Notes:**
Order tracking is essential for long-running tasking orders. Ensure status updates are clear.

---

### PR-018: Monitoring MCP Tools
**Status:** Complete ✅
**Dependencies:** PR-011, PR-013
**Priority:** High

**Description:**
Expose notification/monitoring functionality as MCP tools for setting up automated alerts.

**Files (ESTIMATED - will be refined during Planning):**
- src/mcp/tools/create-notification.ts (create) - Create notification MCP tool
- src/mcp/tools/list-notifications.ts (create) - List notifications MCP tool
- src/mcp/tools/delete-notification.ts (create) - Delete notification MCP tool
- src/mcp/schemas/notifications.schemas.ts (create) - Input schemas
- src/mcp/formatters/notification-results.ts (create) - Format results
- __tests__/mcp/tools/notifications.test.ts (create) - Unit tests
- __tests__/mcp/tools/notifications.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] `create_monitoring_notification` tool implemented
- [ ] `list_notifications` tool implemented
- [ ] `delete_notification` tool implemented
- [ ] Webhook URL guidance in descriptions
- [ ] Filter criteria validation
- [ ] Clear notification status presentation
- [ ] Unit tests >80% coverage
- [ ] Integration tests with full MCP server

**Notes:**
Monitoring enables automation. Provide clear guidance on webhook setup and filter criteria.

---

### PR-019: Pricing MCP Tool
**Status:** Complete ✅
**Dependencies:** PR-012, PR-013
**Priority:** Medium

**Description:**
Expose pricing information as an MCP tool to help agents estimate costs before ordering.

**Files (ESTIMATED - will be refined during Planning):**
- src/mcp/tools/get-pricing.ts (create) - Pricing MCP tool
- src/mcp/schemas/pricing.schemas.ts (create) - Input schemas
- src/mcp/formatters/pricing-results.ts (create) - Format pricing info
- __tests__/mcp/tools/pricing.test.ts (create) - Unit tests
- __tests__/mcp/tools/pricing.integration.test.ts (create) - Integration tests

**Acceptance Criteria:**
- [ ] `get_pricing_info` tool implemented
- [ ] Support for all product types and resolutions
- [ ] Cost estimation based on AOI size
- [ ] Clear pricing tier presentation
- [ ] Reference to official pricing PDF
- [ ] Unit tests >80% coverage
- [ ] Integration tests with full MCP server

**Notes:**
Pricing transparency builds trust. Ensure estimates are accurate and clearly presented.

---

## Block 6: Demo Agent (Depends on: Block 5)

### PR-020: OpenAI Integration
**Status:** Complete ✅
**Dependencies:** PR-013
**Priority:** High

**Description:**
Set up OpenAI API client for GPT-5 with proper configuration, error handling, and token management.

**Files (ESTIMATED - will be refined during Planning):**
- src/agent/openai-client.ts (create) - OpenAI API client
- src/agent/config.ts (create) - Agent configuration
- src/lib/token-counter.ts (create) - Token counting utilities
- __tests__/agent/openai-client.test.ts (create) - Unit tests

**Acceptance Criteria:**
- [ ] OpenAI client initialized with API key from environment
- [ ] GPT-5 model configured (with fallback to gpt-4-turbo)
- [ ] Token counting for cost tracking
- [ ] Proper error handling for API failures
- [ ] Retry logic for transient errors
- [ ] Unit tests >80% coverage

**Notes:**
GPT-5 may not be available yet. Implement fallback to gpt-4-turbo for development.

---

### PR-021: Demo Agent Core Logic
**Status:** Complete ✅
**Dependencies:** PR-014, PR-015, PR-016, PR-017, PR-018, PR-019, PR-020
**Priority:** High

**Description:**
Implement the core demo agent that uses MCP tools through conversational interactions powered by GPT-5.

**Files (ESTIMATED - will be refined during Planning):**
- src/agent/agent.ts (create) - Main agent loop
- src/agent/conversation.ts (create) - Conversation management
- src/agent/tool-executor.ts (create) - MCP tool execution wrapper
- src/agent/prompts.ts (create) - System prompts and templates
- src/cli/index.ts (create) - CLI interface for demo agent
- __tests__/agent/agent.test.ts (create) - Agent unit tests

**Acceptance Criteria:**
- [ ] Agent can invoke MCP tools via OpenAI function calling
- [ ] Conversational context maintained across interactions
- [ ] Clear, natural language responses
- [ ] Proper error handling and recovery
- [ ] Cost tracking (tokens used)
- [ ] CLI interface for interactive demo
- [ ] Unit tests >80% coverage

**Notes:**
This is the showcase piece. Ensure interactions feel natural and demonstrate MCP capabilities well.

---

### PR-022: Demo Scenarios and Examples
**Status:** New
**Dependencies:** PR-021
**Priority:** Medium

**Description:**
Create pre-built demo scenarios showcasing key workflows: archive search, feasibility checking, ordering, and monitoring setup.

**Files (ESTIMATED - will be refined during Planning):**
- examples/search-and-order.md (create) - Archive search and order scenario
- examples/feasibility-check.md (create) - Feasibility and pass prediction scenario
- examples/monitoring-setup.md (create) - Monitoring notification scenario
- examples/cost-estimation.md (create) - Pricing exploration scenario
- src/agent/scenarios.ts (create) - Programmatic scenario runner
- README-DEMO.md (create) - Demo agent usage instructions

**Acceptance Criteria:**
- [ ] At least 4 complete scenario examples
- [ ] Each scenario demonstrates different MCP tools
- [ ] Clear step-by-step instructions
- [ ] Expected outcomes documented
- [ ] Scenarios executable via CLI
- [ ] README with demo instructions

**Notes:**
These examples will be used for marketing and documentation. Make them compelling and easy to follow.

---

## Block 7: Deployment (Depends on: Block 5)

### PR-023: ECS Fargate Configuration
**Status:** Complete ✅
**Dependencies:** PR-002, PR-013
**Priority:** High

**Description:**
Create AWS ECS task definitions, service configurations, and deployment scripts for Fargate.

**Files (ESTIMATED - will be refined during Planning):**
- infrastructure/ecs-task-definition.json (create) - ECS task definition
- infrastructure/ecs-service.json (create) - ECS service configuration
- infrastructure/deploy.sh (create) - Deployment script
- .env.example (create) - Environment variable template
- infrastructure/secrets-manager.tf (create) - Terraform for secrets (optional)

**Acceptance Criteria:**
- [ ] ECS task definition with resource limits (512 CPU, 1GB memory)
- [ ] Service definition with auto-scaling (1-10 tasks)
- [ ] Health check configuration
- [ ] Environment variables from SSM Parameter Store or Secrets Manager
- [ ] IAM roles for task execution
- [ ] Deployment script automates rollout
- [ ] .env.example documents all required environment variables

**Notes:**
Start with minimal resources and tune based on load testing. Use Secrets Manager for API keys.

---

### PR-024: Health Checks and Monitoring
**Status:** New
**Dependencies:** PR-013, PR-023
**Priority:** High

**Description:**
Implement comprehensive health checks and monitoring integration for production observability.

**Files (ESTIMATED - will be refined during Planning):**
- src/health/health-check.ts (create) - Health check endpoint logic
- src/health/metrics.ts (create) - Custom metrics collection
- src/lib/cloudwatch.ts (create) - CloudWatch integration
- __tests__/health/health-check.test.ts (create) - Health check tests

**Acceptance Criteria:**
- [ ] /health endpoint returns 200 when healthy
- [ ] Deep health check validates SkyFi API connectivity
- [ ] Metrics for request count, latency, errors
- [ ] CloudWatch custom metrics integration
- [ ] Alarms for high error rates
- [ ] Dashboard configuration (optional)
- [ ] Unit tests for health check logic

**Notes:**
Health checks should be lightweight but informative. Avoid expensive operations in health checks.

---

## Block 8: Testing (Can start after respective implementations)

### PR-025: Integration Tests for SkyFi API Client
**Status:** Complete ✅
**Dependencies:** PR-007, PR-008, PR-009, PR-010, PR-011, PR-012
**Priority:** High

**Description:**
Comprehensive integration tests for SkyFi API client against live API or high-fidelity mocks.

**Files (ESTIMATED - will be refined during Planning):**
- __tests__/integration/archives.integration.test.ts (create) - Archive search integration tests
- __tests__/integration/orders.integration.test.ts (create) - Order placement integration tests
- __tests__/integration/feasibility.integration.test.ts (create) - Feasibility integration tests
- __tests__/integration/order-management.integration.test.ts (create) - Order management tests
- __tests__/integration/notifications.integration.test.ts (create) - Notifications tests
- __tests__/fixtures/skyfi-responses.ts (create) - Mock API responses
- jest.integration.config.js (create) - Separate config for integration tests

**Acceptance Criteria:**
- [ ] All SkyFi API client methods tested against mocks
- [ ] Mock responses based on actual API responses
- [ ] Error scenarios covered (rate limits, validation errors, etc.)
- [ ] Integration tests run separately from unit tests
- [ ] Tests pass with 100% success rate
- [ ] Documentation on running integration tests

**Notes:**
Use high-fidelity mocks based on docs/openapi.json. Consider optional live API tests with test API key.

---

### PR-026: Integration Tests for MCP Tools
**Status:** Complete ✅
**Dependencies:** PR-014, PR-015, PR-016, PR-017, PR-018, PR-019
**Priority:** High

**Description:**
End-to-end integration tests for all MCP tools with full server initialization and mock SkyFi API.

**Files (ESTIMATED - will be refined during Planning):**
- __tests__/e2e/mcp-tools.e2e.test.ts (create) - Full MCP tool integration tests
- __tests__/e2e/scenarios.e2e.test.ts (create) - Scenario-based tests
- __tests__/helpers/mcp-test-client.ts (create) - Test MCP client
- __tests__/helpers/mock-skyfi-server.ts (create) - Mock SkyFi API server

**Acceptance Criteria:**
- [ ] All MCP tools tested end-to-end
- [ ] Tests use actual MCP protocol communication
- [ ] Mock SkyFi API responds with realistic data
- [ ] Error scenarios tested (validation, API errors)
- [ ] Tests verify tool schemas and responses
- [ ] Tests pass with 100% success rate

**Notes:**
These tests validate the full integration stack. They're slower but catch integration issues.

---

### PR-027: End-to-End Tests for Demo Agent
**Status:** New
**Dependencies:** PR-021, PR-022
**Priority:** Medium

**Description:**
End-to-end tests for the demo agent running complete scenarios against mocked OpenAI and SkyFi APIs.

**Files (ESTIMATED - will be refined during Planning):**
- __tests__/e2e/agent.e2e.test.ts (create) - Demo agent end-to-end tests
- __tests__/helpers/mock-openai.ts (create) - Mock OpenAI API responses
- __tests__/fixtures/agent-conversations.ts (create) - Sample conversations

**Acceptance Criteria:**
- [ ] All demo scenarios tested end-to-end
- [ ] Mocked OpenAI responses for consistent testing
- [ ] Mocked SkyFi API responses
- [ ] Tests verify agent uses tools correctly
- [ ] Tests verify conversation flow
- [ ] Tests pass with 100% success rate

**Notes:**
Mocking GPT-5 is essential for deterministic testing. Focus on verifying tool usage patterns.

---

## Block 9: Caching Layer - P1 (Depends on: Block 3)

### PR-028: Postgres Schema and Migrations
**Status:** Complete ✅
**Dependencies:** PR-002, PR-007, PR-009, PR-010
**Priority:** Medium

**Description:**
Define Postgres database schema for caching archive searches, orders, and feasibility results, with migration tooling.

**Files (ESTIMATED - will be refined during Planning):**
- migrations/001_initial_schema.sql (create) - Initial schema with tables
- migrations/002_indexes.sql (create) - Indexes for performance
- src/db/schema.ts (create) - TypeScript schema definitions
- src/db/migrations.ts (create) - Migration runner
- package.json (modify) - Add migration scripts
- __tests__/db/schema.test.ts (create) - Schema validation tests

**Acceptance Criteria:**
- [ ] Tables: archive_searches, orders_cache, feasibility_cache
- [ ] Proper indexes for query performance
- [ ] TTL columns for cache expiration
- [ ] Foreign key constraints where appropriate
- [ ] Migration runner implemented
- [ ] Up/down migration support
- [ ] Schema documented with comments
- [ ] Tests verify schema creation

**Notes:**
Design schema for fast lookups. Use JSONB columns for flexible caching of API responses.

---

### PR-029: Cache Implementation for Archive Searches
**Status:** New
**Dependencies:** PR-007, PR-028
**Priority:** Medium

**Description:**
Implement caching layer for archive search results to reduce API calls and improve performance.

**Files (ESTIMATED - will be refined during Planning):**
- src/db/client.ts (create) - Postgres client with connection pooling
- src/db/cache/archives-cache.ts (create) - Archive search cache implementation
- src/lib/cache-key.ts (create) - Cache key generation
- src/skyfi/archives.ts (modify) - Integrate caching into archive search
- __tests__/db/cache/archives-cache.test.ts (create) - Cache unit tests

**Acceptance Criteria:**
- [ ] Archive search results cached with 24-hour TTL
- [ ] Cache key based on AOI, date range, filters
- [ ] Cache hit returns results without API call
- [ ] Cache miss fetches from API and stores result
- [ ] Automatic cache expiration based on TTL
- [ ] Connection pooling for efficiency
- [ ] Unit tests verify caching behavior
- [ ] Integration tests with real Postgres

**Notes:**
Ensure cache keys are deterministic and account for all search parameters.

---

### PR-030: Cache Implementation for Orders and Feasibility
**Status:** New
**Dependencies:** PR-009, PR-010, PR-028
**Priority:** Medium

**Description:**
Implement caching for order history and feasibility results to enable quick lookups and reduce API load.

**Files (ESTIMATED - will be refined during Planning):**
- src/db/cache/orders-cache.ts (create) - Orders cache implementation
- src/db/cache/feasibility-cache.ts (create) - Feasibility cache implementation
- src/skyfi/order-management.ts (modify) - Integrate orders caching
- src/skyfi/feasibility.ts (modify) - Integrate feasibility caching
- __tests__/db/cache/orders-cache.test.ts (create) - Orders cache tests
- __tests__/db/cache/feasibility-cache.test.ts (create) - Feasibility cache tests

**Acceptance Criteria:**
- [ ] Orders cached indefinitely (no TTL)
- [ ] Order status updates refresh cache
- [ ] Feasibility results cached with 24-hour TTL
- [ ] Cache keys account for all parameters
- [ ] List orders uses cache with filters
- [ ] Unit tests verify caching behavior
- [ ] Integration tests with real Postgres

**Notes:**
Orders are immutable once created, so cache indefinitely. Feasibility results expire after 24 hours.

---

## Block 10: Documentation

### PR-031: Getting Started Guide and Setup Docs
**Status:** New
**Dependencies:** PR-001, PR-002, PR-013, PR-023
**Priority:** High

**Description:**
Create comprehensive getting started guide covering local development setup, configuration, and deployment.

**Files (ESTIMATED - will be refined during Planning):**
- README.md (create) - Main project README with overview
- docs/getting-started.md (create) - Detailed setup instructions
- docs/configuration.md (create) - Environment variables and configuration
- docs/local-development.md (create) - Local development guide
- docs/deployment.md (create) - Deployment to ECS guide
- docs/troubleshooting.md (create) - Common issues and solutions

**Acceptance Criteria:**
- [ ] README with project overview, features, and quick start
- [ ] Getting started guide with step-by-step setup
- [ ] All environment variables documented
- [ ] Docker and docker-compose usage explained
- [ ] ECS deployment process documented
- [ ] Troubleshooting guide with common errors
- [ ] Links to relevant external docs (MCP, SkyFi, OpenAI)

**Notes:**
Documentation is critical for adoption. Assume readers have basic TypeScript/Docker knowledge.

---

### PR-032: MCP Tools Reference Documentation
**Status:** New
**Dependencies:** PR-014, PR-015, PR-016, PR-017, PR-018, PR-019
**Priority:** High

**Description:**
Create detailed reference documentation for all MCP tools with schemas, examples, and usage patterns.

**Files (ESTIMATED - will be refined during Planning):**
- docs/mcp-tools-reference.md (create) - Complete MCP tools reference
- docs/examples/search-archives.md (create) - Archive search examples
- docs/examples/order-imagery.md (create) - Order placement examples
- docs/examples/feasibility.md (create) - Feasibility check examples
- docs/examples/monitoring.md (create) - Monitoring setup examples

**Acceptance Criteria:**
- [ ] All MCP tools documented with schemas
- [ ] Input parameter descriptions
- [ ] Output format descriptions
- [ ] Example requests and responses
- [ ] Error scenarios documented
- [ ] Best practices for each tool
- [ ] Cross-references between related tools

**Notes:**
This is the primary reference for AI agents and developers. Ensure examples are realistic and complete.

---

### PR-033: Delivery Configuration Guides
**Status:** New
**Dependencies:** PR-008, PR-015
**Priority:** High

**Description:**
Create comprehensive guides for configuring delivery to S3, Google Cloud Storage, and Azure Blob Storage.

**Files (ESTIMATED - will be refined during Planning):**
- docs/delivery/s3-setup.md (create) - AWS S3 delivery configuration
- docs/delivery/gcs-setup.md (create) - Google Cloud Storage configuration
- docs/delivery/azure-setup.md (create) - Azure Blob Storage configuration
- docs/delivery/aoi-polygons.md (create) - AOI polygon generation guide

**Acceptance Criteria:**
- [ ] S3 setup with IAM policy examples
- [ ] GCS setup with service account configuration
- [ ] Azure setup with connection string and Entra App methods
- [ ] Security best practices for each platform
- [ ] Example delivery configurations
- [ ] AOI polygon generation with Colab links
- [ ] Troubleshooting delivery issues

**Notes:**
Delivery configuration is often a stumbling block. Provide clear, copy-paste examples.

---

### PR-034: Demo Agent Documentation
**Status:** New
**Dependencies:** PR-021, PR-022
**Priority:** Medium

**Description:**
Create user-facing documentation for the demo agent including setup, usage, and example scenarios.

**Files (ESTIMATED - will be refined during Planning):**
- docs/demo-agent.md (create) - Demo agent overview and setup
- docs/demo-scenarios.md (create) - Pre-built scenario walkthroughs
- docs/agent-customization.md (create) - Customizing the demo agent

**Acceptance Criteria:**
- [ ] Demo agent setup instructions
- [ ] OpenAI API key configuration
- [ ] Scenario walkthrough with screenshots/examples
- [ ] Customization guide for advanced users
- [ ] Cost estimation for running scenarios
- [ ] Limitations and known issues documented

**Notes:**
This is the showcase documentation. Make it engaging and easy to follow for non-technical users.

---

## Block 11: Final Architecture Documentation (Depends on: All previous blocks)

### PR-035: Comprehensive Architecture Documentation
**Status:** New
**Dependencies:** All feature PRs (PR-001 through PR-034)
**Priority:** Medium

**Description:**
Create detailed technical documentation in `docs/architecture.md` that serves as the definitive reference for the system's design, implementation, and operational characteristics.

**Files (ESTIMATED - will be refined during Planning):**
- docs/architecture.md (create) - Comprehensive architecture document with Mermaid diagrams

**Documentation Requirements:**

The architecture document should include:

1. **System Architecture**
   - High-level architecture overview with component diagram
   - Technology stack and rationale for choices
   - Integration points: MCP clients, SkyFi API, OpenAI API, cloud storage
   - Data flow patterns through the system

2. **Component Architecture**
   - Module/package organization and hierarchy
   - Key classes and functions: MCP server, SkyFi client, cache layer
   - Design patterns used (Repository pattern for caching, Factory for delivery configs)
   - State management approach (stateless server, Postgres caching)

3. **Data Models**
   - Complete TypeScript interfaces from SkyFi API
   - Postgres schema for caching layer
   - MCP tool schemas and parameter definitions
   - Relationships between data entities

4. **Key Subsystems**
   - SkyFi API client architecture with retry/rate limiting
   - MCP server with HTTP/SSE transport
   - Demo agent AI pipeline (OpenAI → MCP tools → SkyFi API)
   - Caching layer with TTL management

5. **Security Architecture**
   - API key handling and storage (environment variables, Secrets Manager)
   - Delivery credential validation and transmission
   - No PCI compliance needed (payment via SkyFi)
   - Secrets management best practices

6. **Deployment Architecture**
   - Docker multi-stage build process
   - ECS Fargate task and service configuration
   - Environment configuration and secrets management
   - Health checks and monitoring setup
   - Troubleshooting guide for common deployment issues

7. **Visual Diagrams** (Mermaid syntax)
   - System architecture diagram (MCP clients → MCP server → SkyFi API)
   - Sequence diagram for archive search and order workflow
   - Sequence diagram for feasibility check and tasking order
   - Component dependency diagram
   - Caching layer architecture
   - Demo agent conversation flow

8. **Performance Characteristics**
   - Response time targets (<2s simple, <5s complex operations)
   - Caching hit rate targets (>70%)
   - Concurrent connection support (100+)
   - Rate limiting and retry strategies

**Acceptance Criteria:**
- [ ] A developer unfamiliar with the codebase can understand the system design by reading this document
- [ ] All major architectural decisions are explained with rationale
- [ ] Mermaid diagrams render correctly in markdown viewers
- [ ] Document reflects the actual implemented system (not idealized design)
- [ ] All key components and their interactions are documented
- [ ] Security considerations are clearly explained
- [ ] Deployment process is documented with troubleshooting steps

**Notes:**
This is typically a 60-90 minute task. The agent should:
1. Read through all completed PRs to understand the implementation journey
2. Review the actual codebase to see what was built
3. Identify the key architectural patterns that emerged
4. Create clear, accurate diagrams using Mermaid syntax
5. Write for an audience of developers joining the project

This document should be comprehensive enough that a new developer can understand the entire system architecture without having to read through all the code.

---

## Summary

**Total PRs:** 35
**Dependency Blocks:** 11
**Estimated Total Time:** 25-35 hours of agent work (assuming 30-60 min per PR)

**Parallelization Opportunities:**
- Block 1 PRs can all run in parallel (3 PRs)
- Block 2 PRs can run in parallel after Block 1 (3 PRs)
- Block 3 PRs can run in parallel after Block 2 (6 PRs)
- Block 5 PRs can run in parallel after Block 3 + Block 4 (6 PRs)
- Blocks 7, 8, 9, 10 can have significant parallelization

**Critical Path:**
Block 1 → Block 2 → Block 4 → Block 5 → Block 6 → Block 11
(Approximately 12-15 hours on critical path with optimal parallelization)

**Priority Distribution:**
- High Priority: 25 PRs (foundation, core features, testing)
- Medium Priority: 10 PRs (caching, documentation, demo enhancements)
- Low Priority: 0 PRs

**Testing Coverage:**
- Unit tests required for all PRs (>80% coverage)
- Integration tests in Block 8
- End-to-end tests for agent in Block 8

**P1 Features (Should-Have):**
- PR-028, PR-029, PR-030: Postgres caching layer
- PR-023, PR-024: Full cloud deployment with monitoring

**P0 Features (Must-Have):**
- All other PRs

---

## Notes for Agents

1. **Claiming PRs**: Before claiming a PR, verify all dependencies are in `Complete` status
2. **File Lists**: File lists are estimates. During Planning phase, verify and refine the file list
3. **File Conflicts**: Check file lists of other PRs to avoid conflicts. If multiple PRs touch the same file, coordinate or work sequentially
4. **Testing**: Every PR must include tests. Don't mark Complete without tests
5. **Documentation**: Update relevant docs if your PR changes user-facing behavior
6. **Coding Standards**: Follow `.claude/rules/coding-standards.md` (created in PR-003)
7. **Commits**: Use clear, descriptive commit messages following project conventions
8. **PR Size**: If a PR is taking >90 minutes, consider splitting it and updating the task list

**State Transitions:**
- `New` → Agent claims and moves to `Planning`
- `Planning` → Agent verifies files and moves to `Blocked-Ready` or `In Progress`
- `In Progress` → Agent completes work and moves to `Complete`
- `Complete` → QC agent reviews and moves to `Merged` or `Broken`
- `Broken` → Agent fixes and returns to `Complete`
