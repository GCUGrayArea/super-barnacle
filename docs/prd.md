# Product Requirements Document: SkyFi MCP

**Version:** 1.0
**Last Updated:** 2025-11-15
**Organization:** SkyFi (Gold Tier)

---

## Product Overview

### Description
SkyFi MCP (Model Context Protocol) is an AI-driven platform that enables autonomous agents to seamlessly interact with SkyFi's geospatial satellite imagery services. The system consists of a remote MCP server exposing SkyFi's public API methods, and a polished demo agent showcasing conversational interaction patterns for satellite imagery ordering and exploration.

### Problem Statement
With the proliferation of autonomous AI systems across various industries, the need for seamless access to high-quality geospatial data has become critical. Current solutions lack comprehensive integration required for AI agents to efficiently interact with geospatial platforms. SkyFi MCP addresses this gap by offering a fully-featured, remote-access platform that allows AI agents to perform complex tasks such as data exploration, order placements, feasibility checking, and monitoring setups with ease and precision.

### Target Users
- **AI Developers**: Need seamless integration tools and comprehensive documentation to develop AI applications
- **Enterprise Customers**: Require reliable, scalable solutions for AI-driven geospatial data access
- **Research Institutions**: Seek advanced tools for data exploration and analysis
- **End Users**: Desire intuitive interfaces to interact with complex AI systems through natural conversation

### Success Criteria
- Sales increase by 20% through enhanced AI-driven access
- User base expansion by 15% by attracting AI developers and agents
- Achieve at least 500 downloads of the demo agent
- 4.5-star average rating for the open-source demo agent
- Improved visibility and ranking in AI-specific search results

---

## Functional Requirements

### P0: Must-Have Features

#### 1. MCP Server with SkyFi API Integration
**Description:** Remote MCP server implementing the Model Context Protocol specification, exposing SkyFi's public API methods as MCP tools.

**Core Capabilities:**
- **Archive Search**: Search SkyFi's archive catalog by AOI, date range, product type, resolution, cloud coverage
- **Order Placement**: Place orders for both archive and tasking imagery with delivery configuration
- **Feasibility Checking**: Check task feasibility, pricing, and satellite pass predictions before ordering
- **Order Management**: List orders, retrieve order details, check delivery status, trigger redelivery
- **Monitoring Setup**: Create AOI-based notifications with webhook delivery for new imagery
- **Authentication**: Support API key-based authentication for SkyFi platform
- **Pricing Exploration**: Retrieve pricing information for different product types and resolutions

**User Flows:**
1. Agent searches archives → reviews results → selects image → places order → monitors delivery
2. Agent checks feasibility → reviews satellite passes → places tasking order → monitors completion
3. Agent sets up monitoring → receives webhook notifications → automatically orders new imagery
4. Agent explores pricing → calculates costs → confirms with user → places order

**Input Validation:**
- AOI polygons must be valid WKT format, convex, with max 500 vertices
- Archive search AOI must be ≤500,000 sqkm
- Date ranges must be valid ISO 8601 timestamps
- Product types must be from allowed enum: DAY, MULTISPECTRAL, SAR
- Resolutions must be from allowed enum: LOW, MEDIUM, HIGH, VERY_HIGH
- Delivery drivers must be S3, GS, or AZURE with valid credentials

**Edge Cases:**
- Handle API rate limiting gracefully
- Retry failed requests with exponential backoff
- Validate delivery credentials before order placement
- Handle long-running operations (tasking orders can take days)
- Gracefully handle partial order failures

#### 2. Conversational Order Placement
**Description:** Enable natural language ordering with multi-step confirmation flows.

**Features:**
- Price confirmation before order placement
- Feasibility checking presented conversationally
- Delivery configuration validation and confirmation
- Order status tracking with human-readable updates

**User Flow:**
1. User describes what imagery they need in natural language
2. Agent translates to SkyFi API parameters
3. Agent checks feasibility and presents options
4. Agent calculates and presents pricing
5. User confirms
6. Agent places order and monitors progress
7. Agent notifies user of delivery completion

#### 3. Stateless HTTP + SSE Transport
**Description:** MCP server supports stateless HTTP transport with Server-Sent Events for streaming.

**Requirements:**
- No session state stored server-side
- Each request contains full authentication context
- SSE for real-time order status updates
- Support for multiple concurrent client connections

#### 4. Demo Agent
**Description:** Polished demo agent showcasing SkyFi MCP capabilities for deep research and ordering.

**Features:**
- Uses GPT-5 via OpenAI API for natural language understanding
- Demonstrates archive searching with iterative refinement
- Shows feasibility checking and satellite pass selection
- Demonstrates conversational ordering with price confirmation
- Illustrates monitoring setup with webhook configuration
- Provides example integrations with delivery platforms (S3, GCS, Azure)

**User Flows:**
- Research use case: "Find me the best imagery of downtown Austin from the last month"
- Ordering use case: "Order a high-resolution image of this area, deliver to my S3 bucket"
- Monitoring use case: "Alert me when new imagery is available for this AOI"

#### 5. Authentication and Payment Support
**Description:** Secure handling of SkyFi API keys and payment information.

**Features:**
- Environment variable configuration for API keys
- Secure transmission of credentials (never logged)
- Support for API key rotation
- Clear error messages for authentication failures
- Payment handled through SkyFi platform (no PCI compliance needed in MCP server)

#### 6. Documentation
**Description:** Comprehensive documentation for developers integrating with SkyFi MCP.

**Includes:**
- Getting started guide
- MCP tool reference
- SkyFi API integration examples
- Delivery configuration guides (S3, GCS, Azure)
- AOI polygon generation examples
- Demo agent usage instructions
- Troubleshooting guide

### P1: Should-Have Features

#### 1. Postgres Caching Layer
**Description:** Cache previous orders and search results to reduce API calls and improve response times.

**Features:**
- Cache archive search results (with TTL)
- Cache order history for quick retrieval
- Cache feasibility results for common AOIs
- Invalidation strategy for stale data

**Benefits:**
- Reduced SkyFi API load
- Faster response times for repeated queries
- Better user experience for iterative exploration
- Cost reduction from fewer API calls

#### 2. Cloud Deployment with Multi-User Support
**Description:** Deploy MCP server to cloud with support for multiple API key configurations.

**Features:**
- ECS Fargate deployment configuration
- Environment-based configuration
- Health check endpoints
- Metrics and monitoring integration
- Auto-scaling configuration

### P2: Nice-to-Have Features

#### 1. Enhanced UX Features
**Description:** Advanced AI-driven interaction capabilities.

**Features:**
- Intelligent AOI suggestions based on user intent
- Automatic satellite pass selection based on requirements
- Cost optimization recommendations
- Historical order pattern analysis
- Proactive monitoring suggestions

---

## Technical Requirements

### Technology Stack

#### Core Technologies
- **Language:** TypeScript (ES2022+)
- **Runtime:** Node.js 20.x LTS
- **MCP SDK:** @modelcontextprotocol/sdk
- **AI Model:** GPT-5 via OpenAI API (for demo agent)
- **Database:** PostgreSQL 16 (for caching layer - P1)
- **Containerization:** Docker with multi-stage builds
- **Deployment:** AWS ECS with Fargate

#### Key Dependencies
- `@modelcontextprotocol/sdk` - MCP server implementation
- `openai` - GPT-5 API client for demo agent
- `zod` - Runtime type validation
- `axios` - HTTP client for SkyFi API
- `pg` - PostgreSQL client (P1 caching layer)
- `winston` - Structured logging
- `dotenv` - Environment configuration

### Coding Standards

All code must follow the standards defined in `.claude/rules/coding-standards.md`:
- TypeScript strict mode enabled
- ESLint with Airbnb config
- Prettier for formatting
- 100% type coverage (no `any` types without justification)
- Comprehensive JSDoc comments for public APIs
- Unit test coverage >80%
- Integration test coverage for all MCP tools

### Integration Points

#### SkyFi Platform API
- **Base URL:** https://app.skyfi.com/platform-api
- **Authentication:** X-Skyfi-Api-Key header
- **Key Endpoints:**
  - `POST /archives` - Search archive imagery
  - `POST /order-archive` - Order archive imagery
  - `POST /order-tasking` - Order new satellite captures
  - `POST /feasibility` - Check task feasibility
  - `POST /feasibility/pass-prediction` - Get satellite pass predictions
  - `GET /orders` - List orders
  - `GET /orders/{order_id}` - Get order details
  - `POST /orders/{order_id}/redelivery` - Trigger redelivery
  - `POST /notifications` - Create monitoring notifications
  - `GET /notifications` - List notifications
  - `POST /pricing` - Get pricing information

#### OpenAI API
- **Purpose:** Power the demo agent with GPT-5
- **Authentication:** Bearer token
- **Models:** gpt-5 (when available, fallback to gpt-4-turbo)

#### Cloud Storage Providers (for delivery)
- **AWS S3** - Archive/tasking delivery destination
- **Google Cloud Storage** - Archive/tasking delivery destination
- **Azure Blob Storage** - Archive/tasking delivery destination

### Performance Requirements
- MCP tool response time <2s for simple operations (search, list)
- MCP tool response time <5s for complex operations (feasibility, pricing)
- Support 100+ concurrent client connections
- Handle API rate limits gracefully (retry with backoff)
- Cache hit rate >70% for repeated queries (P1)

### Security and Privacy Considerations
- API keys stored in environment variables only
- Never log API keys or payment information
- Validate all input parameters against SkyFi API spec
- Use HTTPS for all external communication
- Secrets management via AWS Secrets Manager (for ECS deployment)
- Docker images scanned for vulnerabilities
- No sensitive data in Docker image layers

### Data Persistence Requirements

#### MVP (P0)
- No local persistence required
- All data retrieved from SkyFi API on demand
- Stateless server design

#### P1 (Should-Have)
- PostgreSQL database for caching
- Schema:
  - `archive_searches` - Cached archive search results with TTL
  - `orders` - Cached order history
  - `feasibility_checks` - Cached feasibility results
- Automatic cache invalidation (24-hour TTL for searches, indefinite for orders)
- Database migrations using a migration tool (e.g., node-pg-migrate)

---

## Non-Functional Requirements

### Scalability
- Horizontal scaling via ECS service auto-scaling
- Stateless design enables unlimited horizontal scaling
- Database connection pooling (P1)
- Target: Support 1000+ active users simultaneously

### Reliability/Availability
- Target uptime: 99.5% (P0), 99.9% (P1 with cloud deployment)
- Graceful degradation when SkyFi API is unavailable
- Automatic retry with exponential backoff
- Health check endpoint for load balancer monitoring
- Structured logging for debugging and monitoring

### Observability
- Structured JSON logging with Winston
- Log levels: DEBUG, INFO, WARN, ERROR
- Correlation IDs for request tracing
- Metrics for API call latency, success/failure rates
- CloudWatch integration for ECS deployment

### Compatibility
- Node.js 20.x LTS
- Docker 24+
- Compatible with all major MCP clients (Claude Desktop, etc.)
- OpenAPI 3.0 compatible with SkyFi API spec

### Accessibility
- CLI-based demo agent accessible via terminal
- Clear, descriptive error messages
- Comprehensive documentation for developers with disabilities
- Support for screen reader-friendly output formats

---

## Acceptance Criteria

### MCP Server
- [ ] All SkyFi API endpoints exposed as MCP tools
- [ ] Successful archive search and result parsing
- [ ] Successful order placement (archive and tasking)
- [ ] Feasibility checking with pass prediction
- [ ] Order status monitoring
- [ ] Notification/monitoring setup
- [ ] Proper error handling and validation
- [ ] HTTP + SSE transport working
- [ ] Comprehensive unit and integration tests (>80% coverage)
- [ ] Docker image builds successfully
- [ ] Deploys to ECS Fargate without errors

### Demo Agent
- [ ] Successfully demonstrates archive searching
- [ ] Successfully demonstrates feasibility checking
- [ ] Successfully demonstrates order placement with price confirmation
- [ ] Successfully demonstrates monitoring setup
- [ ] Clear, conversational interaction patterns
- [ ] Handles errors gracefully
- [ ] Comprehensive README with setup instructions

### Documentation
- [ ] Getting started guide complete
- [ ] All MCP tools documented with examples
- [ ] Delivery configuration guides for S3, GCS, Azure
- [ ] AOI polygon generation examples
- [ ] Troubleshooting guide
- [ ] Architecture documentation (final PR)

### Deployment
- [ ] Docker image builds in <5 minutes
- [ ] ECS task definition working
- [ ] Health checks passing
- [ ] Environment configuration documented
- [ ] CI/CD pipeline (if implemented)

### Caching Layer (P1)
- [ ] Postgres schema created
- [ ] Cache hit rate >70% for repeated queries
- [ ] Automatic cache invalidation working
- [ ] Migration scripts executable

---

## Out of Scope

### Explicitly Not Included
- **Custom satellite data processing** - SkyFi handles all imagery processing
- **Payment processing** - Handled entirely by SkyFi platform
- **Custom AI algorithms** - Use OpenAI API, not custom models
- **Mobile apps** - Focus on MCP server and CLI demo agent only
- **Web UI** - CLI/API only for MVP
- **Advanced GIS functionality** - Basic AOI polygon support only
- **Multi-tenancy** - Single API key per deployment (MVP)
- **Real-time satellite tracking** - Use SkyFi's pass prediction API
- **Image viewing/processing** - Delivery only, no visualization
- **Alternative AI provider integrations** - OpenAI only for MVP
- **On-premise deployment** - Cloud-only (ECS Fargate)

### Future Considerations (Not in Initial Release)
- GraphQL API for MCP server
- WebSocket transport for MCP
- Built-in image preview/thumbnail generation
- Advanced caching strategies (Redis, etc.)
- Multi-region deployment
- Custom SkyFi API rate limiting
- Bulk order management
- Cost tracking and budget alerts

---

## Appendix

### Related Documents
- Project Specification: `docs/spec.md`
- SkyFi API Documentation: `docs/openapi.json`
- Coding Standards: `.claude/rules/coding-standards.md`
- Task List: `docs/task-list.md`

### Glossary
- **MCP**: Model Context Protocol - A standard for AI agent tool integration
- **AOI**: Area of Interest - Geographic polygon defining imagery region
- **WKT**: Well-Known Text - Standard format for geometric data
- **SSE**: Server-Sent Events - HTTP streaming protocol
- **Tasking**: Ordering new satellite imagery captures (vs archive imagery)
- **Feasibility**: Analysis of whether a tasking request can be fulfilled
- **Pass Prediction**: Forecasting when satellites will be over an AOI
- **Deliverable**: Final imagery product delivered to user's storage

### References
- MCP Specification: https://modelcontextprotocol.io/
- SkyFi Platform: https://app.skyfi.com/
- SkyFi Pricing: https://skyfi.com/files/SkyFi_Pricing_2025.pdf
- OpenAI API: https://platform.openai.com/docs/
- TypeScript Handbook: https://www.typescriptlang.org/docs/
