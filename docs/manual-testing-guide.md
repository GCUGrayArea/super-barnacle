# Manual Testing Guide - SkyFi MCP

**Version:** 1.0.0
**Last Updated:** 2025-11-17
**Purpose:** Comprehensive manual test cases for QA validation

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Test Execution Order](#test-execution-order)
4. [MCP Server Tests](#mcp-server-tests)
5. [MCP Tool Tests](#mcp-tool-tests)
6. [Demo Agent Tests](#demo-agent-tests)
7. [Caching Layer Tests](#caching-layer-tests)
8. [Health & Monitoring Tests](#health--monitoring-tests)
9. [Deployment Tests](#deployment-tests)
10. [Performance Tests](#performance-tests)
11. [Security Tests](#security-tests)
12. [Test Results Template](#test-results-template)

---

## Prerequisites

### Required Software

- [ ] Node.js 20.x LTS installed
- [ ] PostgreSQL 16+ installed and running
- [ ] Docker Desktop installed (for deployment tests)
- [ ] Git installed
- [ ] cURL or Postman for API testing
- [ ] A text editor or IDE

### Required Accounts & Credentials

- [ ] SkyFi API key (from https://app.skyfi.com)
- [ ] OpenAI API key (for demo agent tests)
- [ ] AWS account (for S3 delivery tests - optional)
- [ ] GCS account (for GCS delivery tests - optional)
- [ ] Azure account (for Azure delivery tests - optional)

### Test Data

Prepare the following test data before starting:

```bash
# Austin, TX - Small area for testing
TEST_AOI_AUSTIN="POLYGON((-97.7431 30.2672, -97.7431 30.2872, -97.7231 30.2872, -97.7231 30.2672, -97.7431 30.2672))"

# Golden Gate Bridge - Popular landmark
TEST_AOI_GGB="POLYGON((-122.4784 37.8199, -122.4784 37.8299, -122.4684 37.8299, -122.4684 37.8199, -122.4784 37.8199))"

# Date ranges for testing
TEST_FROM_DATE="2024-01-01T00:00:00Z"
TEST_TO_DATE="2024-12-31T23:59:59Z"
```

---

## Environment Setup

### Step 1: Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/skyfi-mcp.git
cd skyfi-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build
```

**Expected Result:** ✅ No errors, `dist/` folder created

---

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Configuration:**

```bash
# SkyFi API
SKYFI_API_KEY=sk_live_your_api_key_here
SKYFI_BASE_URL=https://api.skyfi.com/v1

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/skyfi_mcp
# OR
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=skyfi_mcp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# OpenAI (for demo agent)
OPENAI_API_KEY=sk-your_openai_key_here

# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

**Expected Result:** ✅ `.env` file configured with valid credentials

---

### Step 3: Setup Database

```bash
# Start PostgreSQL (if not running)
# macOS:
brew services start postgresql@16

# Linux:
sudo systemctl start postgresql

# Create database
createdb skyfi_mcp

# Run migrations
npm run migrate:up
```

**Expected Result:** ✅ Database created, migrations applied successfully

**Validation:**

```bash
# Check migrations table
psql skyfi_mcp -c "SELECT * FROM schema_migrations;"
```

Expected output:
```
 id | version          | applied_at          | description
----+------------------+---------------------+-------------
  1 | 001_initial_schema | 2025-11-17 12:00:00 | Initial database schema...
  2 | 002_indexes        | 2025-11-17 12:00:01 | Indexes for performance
```

---

### Step 4: Start MCP Server

```bash
# Start server in development mode
npm run dev
```

**Expected Result:** ✅ Server starts without errors

**Expected Console Output:**

```
{"level":"info","message":"SkyFi MCP Server - Starting..."}
{"level":"info","message":"Database connection pool created","host":"localhost","port":5432}
{"level":"info","message":"MCP tools registered","count":13}
{"level":"info","message":"MCP server listening","port":3000}
{"level":"info","message":"SkyFi MCP Server - Ready"}
```

---

## Test Execution Order

Execute tests in this order to ensure dependencies are met:

1. **MCP Server Tests** (verify server is running)
2. **Health & Monitoring Tests** (verify infrastructure)
3. **MCP Tool Tests** (verify each tool individually)
4. **Caching Layer Tests** (verify caching works)
5. **Demo Agent Tests** (verify end-to-end workflows)
6. **Deployment Tests** (verify Docker/production config)
7. **Performance Tests** (verify scalability)
8. **Security Tests** (verify credentials handling)

---

## MCP Server Tests

### TEST-MCP-001: Server Startup

**Objective:** Verify MCP server starts successfully

**Steps:**
1. Ensure `.env` is configured
2. Run `npm run dev`
3. Wait 5 seconds

**Expected Results:**
- ✅ No errors in console
- ✅ Console shows "SkyFi MCP Server - Ready"
- ✅ Port 3000 is listening

**Validation:**

```bash
# Check port is listening
lsof -i :3000
# OR
netstat -an | grep 3000
```

**Pass Criteria:** Port 3000 shows LISTEN state

---

### TEST-MCP-002: Health Check Endpoint

**Objective:** Verify health check endpoint works

**Steps:**
1. Ensure server is running
2. Execute health check request

```bash
curl http://localhost:3000/health | jq
```

**Expected Results:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 120,
  "components": {
    "server": {
      "status": "healthy",
      "message": "Server is running"
    },
    "skyfi": {
      "status": "healthy",
      "message": "SkyFi API is reachable",
      "responseTime": 245
    }
  },
  "activeTransports": 0
}
```

**Pass Criteria:**
- ✅ HTTP 200 status
- ✅ `status: "healthy"`
- ✅ All components healthy

---

### TEST-MCP-003: SSE Endpoint Connection

**Objective:** Verify SSE endpoint establishes connection

**Steps:**
1. Open a new terminal
2. Connect to SSE endpoint

```bash
curl -N http://localhost:3000/sse
```

**Expected Results:**
- ✅ Connection established (terminal hangs, waiting for events)
- ✅ Initial SSE event received

**Expected Output:**

```
event: endpoint
data: /message/<session-id>

event: message
data: {"jsonrpc":"2.0","method":"initialize",...}
```

**Pass Criteria:** SSE connection maintained, session ID generated

---

### TEST-MCP-004: List Available Tools

**Objective:** Verify MCP server lists all 13 tools

**Steps:**
1. Establish SSE connection (from TEST-MCP-003)
2. Send list tools request via POST

```bash
# In a new terminal, get session ID from SSE connection output
SESSION_ID="<session-id-from-sse>"

# Send list tools request
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }' | jq
```

**Expected Results:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "search_satellite_archives",
        "description": "Search SkyFi's satellite imagery archive...",
        "inputSchema": {...}
      },
      {
        "name": "get_archive_details",
        "description": "Get detailed information...",
        "inputSchema": {...}
      },
      // ... 11 more tools
    ]
  }
}
```

**Pass Criteria:**
- ✅ 13 tools returned
- ✅ Each tool has name, description, inputSchema

**Tool Names Checklist:**
- [ ] search_satellite_archives
- [ ] get_archive_details
- [ ] order_archive_imagery
- [ ] order_tasking_imagery
- [ ] check_tasking_feasibility
- [ ] predict_satellite_passes
- [ ] list_orders
- [ ] get_order_details
- [ ] trigger_order_redelivery
- [ ] create_monitoring_notification
- [ ] list_notifications
- [ ] delete_notification
- [ ] get_pricing_info

---

## MCP Tool Tests

### TEST-TOOL-001: search_satellite_archives (Success)

**Objective:** Verify archive search returns results

**Prerequisites:**
- Valid SkyFi API key
- MCP server running

**Test Data:**

```bash
TEST_AOI='POLYGON((-97.7431 30.2672, -97.7431 30.2872, -97.7231 30.2872, -97.7231 30.2672, -97.7431 30.2672))'
```

**Steps:**

1. Establish SSE connection
2. Send search request

```bash
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_satellite_archives",
      "arguments": {
        "aoi": "POLYGON((-97.7431 30.2672, -97.7431 30.2872, -97.7231 30.2872, -97.7231 30.2672, -97.7431 30.2672))",
        "fromDate": "2024-01-01T00:00:00Z",
        "toDate": "2024-12-31T23:59:59Z",
        "maxCloudCoverage": 20
      }
    },
    "id": 2
  }' | jq
```

**Expected Results:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "# Satellite Archive Search Results\n\n**Search Parameters:**\n- Area of Interest: 4.0 km²\n- Date Range: 2024-01-01 to 2024-12-31\n- Max Cloud Coverage: 20%\n\n**Results Found:** 15 images\n\n## Top Results\n\n### 1. Planet - 2024-10-15\n- **Resolution:** HIGH (3-5m)\n- **Cloud Coverage:** 5%\n..."
      }
    ]
  }
}
```

**Pass Criteria:**
- ✅ HTTP 200 status
- ✅ `result.content[0].type === "text"`
- ✅ Markdown-formatted results
- ✅ At least 1 archive result

**Validation Checklist:**
- [ ] Results include capture date
- [ ] Results include resolution
- [ ] Results include cloud coverage
- [ ] Results include pricing
- [ ] Results include provider

---

### TEST-TOOL-002: search_satellite_archives (Validation Error)

**Objective:** Verify input validation rejects invalid AOI

**Steps:**

```bash
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_satellite_archives",
      "arguments": {
        "aoi": "INVALID_WKT",
        "fromDate": "2024-01-01T00:00:00Z"
      }
    },
    "id": 3
  }' | jq
```

**Expected Results:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error executing tool search_satellite_archives: ..."
      }
    ],
    "isError": true
  }
}
```

**Pass Criteria:**
- ✅ Error response returned
- ✅ `isError: true`
- ✅ Error message explains validation failure

---

### TEST-TOOL-003: search_satellite_archives (Filter by Product Type)

**Objective:** Verify filtering by product type works

**Steps:**

```bash
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_satellite_archives",
      "arguments": {
        "aoi": "POLYGON((-97.7431 30.2672, -97.7431 30.2872, -97.7231 30.2872, -97.7231 30.2672, -97.7431 30.2672))",
        "fromDate": "2024-01-01T00:00:00Z",
        "toDate": "2024-12-31T23:59:59Z",
        "productTypes": ["SAR"]
      }
    },
    "id": 4
  }' | jq
```

**Expected Results:**
- ✅ Only SAR (Synthetic Aperture Radar) results returned
- ✅ No optical (DAY/NIGHT) results

**Validation:**
Check that all results in the response have `productType: "SAR"`

---

### TEST-TOOL-004: get_archive_details

**Objective:** Verify fetching single archive details

**Prerequisites:**
- Archive ID from previous search (TEST-TOOL-001)

**Steps:**

```bash
# Use archiveId from previous search results
ARCHIVE_ID="<archive-id-from-search>"

curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"get_archive_details\",
      \"arguments\": {
        \"archiveId\": \"$ARCHIVE_ID\"
      }
    },
    \"id\": 5
  }" | jq
```

**Expected Results:**
- ✅ Single archive details returned
- ✅ Includes metadata (capture date, resolution, pricing)
- ✅ Includes GeoJSON footprint

**Pass Criteria:**
Response includes all expected fields:
- [ ] archiveId
- [ ] captureDate
- [ ] productType
- [ ] resolution
- [ ] cloudCoverage
- [ ] pricePerSqkm
- [ ] provider

---

### TEST-TOOL-005: check_tasking_feasibility

**Objective:** Verify feasibility check for tasking orders

**Steps:**

```bash
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "check_tasking_feasibility",
      "arguments": {
        "aoi": "POLYGON((-97.7431 30.2672, -97.7431 30.2872, -97.7231 30.2872, -97.7231 30.2672, -97.7431 30.2672))",
        "startDate": "2025-11-20T00:00:00Z",
        "endDate": "2025-11-25T23:59:59Z",
        "productType": "DAY",
        "resolution": "HIGH"
      }
    },
    "id": 6
  }' | jq
```

**Expected Results:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "# Tasking Feasibility Check\n\n**Feasibility Score:** 85%\n\n**Satellite Passes:** 3 opportunities\n\n### Pass 1: Planet\n- **Time:** 2025-11-21 14:30:00 UTC\n- **Duration:** 5 minutes\n..."
      }
    ]
  }
}
```

**Pass Criteria:**
- ✅ Feasibility score returned (0-100%)
- ✅ Satellite passes listed with times
- ✅ Provider information included

---

### TEST-TOOL-006: predict_satellite_passes

**Objective:** Verify satellite pass prediction

**Steps:**

```bash
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "predict_satellite_passes",
      "arguments": {
        "aoi": "POLYGON((-97.7431 30.2672, -97.7431 30.2872, -97.7231 30.2872, -97.7231 30.2672, -97.7431 30.2672))",
        "startDate": "2025-11-20T00:00:00Z",
        "endDate": "2025-11-25T23:59:59Z"
      }
    },
    "id": 7
  }' | jq
```

**Expected Results:**
- ✅ List of satellite passes with exact times
- ✅ Each pass includes: satellite name, provider, time, duration
- ✅ Provider window ID included (for Planet)

---

### TEST-TOOL-007: get_pricing_info

**Objective:** Verify pricing information retrieval

**Steps:**

```bash
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_pricing_info",
      "arguments": {
        "productType": "DAY",
        "resolution": "HIGH"
      }
    },
    "id": 8
  }' | jq
```

**Expected Results:**
- ✅ Pricing tiers for specified product type
- ✅ Prices per km² and per full scene
- ✅ Different providers and their pricing

---

### TEST-TOOL-008: order_archive_imagery (Dry Run)

**Objective:** Verify order placement validation (DO NOT ACTUALLY ORDER)

**⚠️ WARNING:** This test uses real API. Do NOT submit unless you want to create a real order.

**Steps:**

```bash
# First, search for an archive
# Then, prepare order parameters (DO NOT EXECUTE without approval)

# For validation testing only - check input schema
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "order_archive_imagery",
      "arguments": {
        "archiveId": "test-invalid-id",
        "deliveryDriver": "INVALID_DRIVER"
      }
    },
    "id": 9
  }' | jq
```

**Expected Results:**
- ✅ Validation error returned
- ✅ Error message explains invalid driver
- ✅ No order created

**Pass Criteria:**
- [ ] Input validation works
- [ ] Clear error messages
- [ ] No charges incurred

---

### TEST-TOOL-009: list_orders

**Objective:** Verify listing orders

**Steps:**

```bash
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_orders",
      "arguments": {
        "limit": 10
      }
    },
    "id": 10
  }' | jq
```

**Expected Results:**
- ✅ List of orders returned (may be empty if no orders exist)
- ✅ Each order includes: orderId, status, type, createdAt

---

### TEST-TOOL-010: create_monitoring_notification

**Objective:** Verify notification creation

**Prerequisites:**
- Webhook URL (can use https://webhook.site for testing)

**Steps:**

```bash
# Get a test webhook URL from https://webhook.site
WEBHOOK_URL="https://webhook.site/your-unique-id"

curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"create_monitoring_notification\",
      \"arguments\": {
        \"aoi\": \"POLYGON((-97.7431 30.2672, -97.7431 30.2872, -97.7231 30.2872, -97.7231 30.2672, -97.7431 30.2672))\",
        \"webhookUrl\": \"$WEBHOOK_URL\",
        \"productTypes\": [\"DAY\"],
        \"maxCloudCoverage\": 20
      }
    },
    \"id\": 11
  }" | jq
```

**Expected Results:**
- ✅ Notification created successfully
- ✅ Notification ID returned
- ✅ Webhook URL validated

---

### TEST-TOOL-011: list_notifications

**Objective:** Verify listing notifications

**Steps:**

```bash
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_notifications",
      "arguments": {}
    },
    "id": 12
  }' | jq
```

**Expected Results:**
- ✅ List of notifications returned
- ✅ Includes notification from TEST-TOOL-010

---

### TEST-TOOL-012: delete_notification

**Objective:** Verify notification deletion

**Prerequisites:**
- Notification ID from TEST-TOOL-010

**Steps:**

```bash
NOTIFICATION_ID="<id-from-create>"

curl -X POST http://localhost:3000/message/$SESSION_ID \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"delete_notification\",
      \"arguments\": {
        \"notificationId\": \"$NOTIFICATION_ID\"
      }
    },
    \"id\": 13
  }" | jq
```

**Expected Results:**
- ✅ Notification deleted successfully
- ✅ Confirmation message returned

**Validation:**
Run list_notifications again - deleted notification should not appear

---

## Demo Agent Tests

### TEST-AGENT-001: Agent Startup

**Objective:** Verify demo agent CLI starts

**Steps:**

```bash
# Start interactive CLI
npm run start --workspace=cli
# OR
node dist/cli/index.js
```

**Expected Results:**

```
╔══════════════════════════════════════════╗
║  SkyFi Satellite Imagery Agent (Demo)   ║
╚══════════════════════════════════════════╝

Connected to MCP server at http://localhost:3000

Type your request or 'exit' to quit.

>
```

**Pass Criteria:**
- ✅ CLI starts without errors
- ✅ MCP connection established
- ✅ Prompt appears

---

### TEST-AGENT-002: Simple Search Query

**Objective:** Verify agent can perform archive search

**Steps:**

1. Start CLI (from TEST-AGENT-001)
2. Enter query:

```
> Find satellite images of Austin, Texas from the last month
```

**Expected Results:**

```
Searching for satellite images...

I found 15 satellite images of Austin, Texas from the past month.
Here are the top 3 results:

1. **Planet - October 25, 2024**
   - Resolution: HIGH (3-5m)
   - Cloud Coverage: 5%
   - Price: $12.50/km² ($50 full scene)
   - Delivery: 1-2 hours

2. **Satellogic - October 18, 2024**
   - Resolution: VERY HIGH (1-3m)
   - Cloud Coverage: 10%
   - Price: $45.00/km² ($180 full scene)
   - Delivery: 24-48 hours

3. **Planet - October 10, 2024**
   - Resolution: HIGH (3-5m)
   - Cloud Coverage: 15%
   - Price: $12.50/km² ($50 full scene)
   - Delivery: 1-2 hours

Would you like more details on any of these images?

>
```

**Pass Criteria:**
- ✅ Agent understands natural language query
- ✅ Agent calls search_satellite_archives tool
- ✅ Agent presents results in readable format
- ✅ Agent offers follow-up options

---

### TEST-AGENT-003: Multi-Step Workflow

**Objective:** Verify agent can execute multi-step tasks

**Steps:**

```
> Check if it's possible to task a satellite to capture Austin, Texas next week
```

**Expected Agent Actions:**
1. Agent calls `check_tasking_feasibility`
2. Agent calls `predict_satellite_passes`
3. Agent synthesizes results

**Expected Results:**

```
Let me check the feasibility of tasking a satellite for Austin next week...

Good news! Satellite tasking for Austin, Texas is highly feasible next week.

**Feasibility Score:** 85%

**Available Satellite Passes:**

1. **Planet - November 21, 2025 at 14:30 UTC**
   - Duration: 5 minutes
   - Confidence: High

2. **Umbra - November 22, 2025 at 09:15 UTC**
   - Duration: 3 minutes
   - Confidence: Medium

3. **Planet - November 24, 2025 at 15:45 UTC**
   - Duration: 4 minutes
   - Confidence: High

Would you like to proceed with ordering imagery for any of these passes?

>
```

**Pass Criteria:**
- ✅ Agent calls multiple tools
- ✅ Agent correlates information
- ✅ Agent provides actionable recommendations

---

### TEST-AGENT-004: Error Handling

**Objective:** Verify agent handles errors gracefully

**Steps:**

```
> Show me satellite images from the year 3000
```

**Expected Results:**

```
I encountered an issue with your request. The date range you specified
(year 3000) is in the future. Satellite imagery is only available for
past dates up to the present.

Could you please specify a date range in the past? For example:
- "from last month"
- "from 2024"
- "from January to March 2024"

>
```

**Pass Criteria:**
- ✅ Agent catches validation error
- ✅ Agent explains error to user
- ✅ Agent suggests correction

---

### TEST-AGENT-005: Cost Tracking

**Objective:** Verify agent tracks token usage and costs

**Steps:**

1. Execute several queries (from TEST-AGENT-002 and TEST-AGENT-003)
2. Type `stats` to view statistics

```
> stats
```

**Expected Results:**

```
╔═══════════════════════════════════════╗
║        Agent Statistics               ║
╚═══════════════════════════════════════╝

Messages Processed: 3
Tool Calls Executed: 5
Total Tokens Used: 4,523
Total Cost: $0.045
Average Response Time: 2.3s

Tool Call Breakdown:
- search_satellite_archives: 2 calls
- check_tasking_feasibility: 1 call
- predict_satellite_passes: 2 calls

>
```

**Pass Criteria:**
- ✅ Statistics displayed
- ✅ Token count accurate
- ✅ Cost calculated
- ✅ Tool breakdown shown

---

## Caching Layer Tests

### TEST-CACHE-001: Archive Search Cache (First Request)

**Objective:** Verify first search is NOT cached

**Prerequisites:**
- Empty database or clear cache

**Steps:**

1. Clear cache:

```sql
-- Connect to database
psql skyfi_mcp

-- Clear archive searches
DELETE FROM archive_searches;
```

2. Perform archive search (TEST-TOOL-001)
3. Check database:

```sql
SELECT cache_key, result_count, hit_count, created_at
FROM archive_searches;
```

**Expected Results:**

```
 cache_key | result_count | hit_count | created_at
-----------+--------------+-----------+------------
 abc123... | 15           | 0         | 2025-11-17 12:00:00
```

**Pass Criteria:**
- ✅ 1 row inserted
- ✅ `hit_count = 0` (first request)
- ✅ `cache_expires_at` set to NOW() + 24 hours

---

### TEST-CACHE-002: Archive Search Cache (Cache Hit)

**Objective:** Verify second identical search uses cache

**Steps:**

1. Perform same search as TEST-CACHE-001 again
2. Check server logs for "Cache hit" message
3. Check database:

```sql
SELECT cache_key, result_count, hit_count, last_accessed_at
FROM archive_searches;
```

**Expected Results:**

```
 cache_key | result_count | hit_count | last_accessed_at
-----------+--------------+-----------+------------------
 abc123... | 15           | 1         | 2025-11-17 12:01:00
```

**Pass Criteria:**
- ✅ `hit_count` incremented to 1
- ✅ `last_accessed_at` updated
- ✅ Faster response time (<200ms vs ~2s)

**Performance Validation:**
- First request: ~2000ms
- Second request (cache hit): <200ms
- Speedup: ~10x

---

### TEST-CACHE-003: Cache Expiration

**Objective:** Verify cache expires after 24 hours

**Steps:**

1. Insert test cache entry with expired timestamp:

```sql
INSERT INTO archive_searches (
  cache_key,
  aoi_wkt,
  response_data,
  result_count,
  cache_expires_at
) VALUES (
  'test123',
  'POLYGON((...))',
  '{"archives": []}',
  0,
  NOW() - INTERVAL '1 hour'  -- Expired 1 hour ago
);
```

2. Perform search that would match this cache key
3. Verify cache is NOT used

**Expected Results:**
- ✅ Expired entry ignored
- ✅ New API call made
- ✅ New cache entry created

**Validation:**

```sql
SELECT cache_key, cache_expires_at < NOW() as is_expired
FROM archive_searches
WHERE cache_key = 'test123';
```

---

### TEST-CACHE-004: Orders Cache (Indefinite)

**Objective:** Verify orders are cached without expiration

**Prerequisites:**
- At least one order exists (or mock one)

**Steps:**

1. List orders (TEST-TOOL-009)
2. Check database:

```sql
SELECT order_id, order_type, order_status, last_synced_at
FROM orders_cache;
```

**Expected Results:**
- ✅ Orders cached in database
- ✅ NO `cache_expires_at` column (orders never expire)
- ✅ `last_synced_at` shows last refresh time

---

### TEST-CACHE-005: Cache Hit Rate Monitoring

**Objective:** Verify cache hit rate tracking

**Steps:**

1. Perform 10 searches (5 unique, each done twice)
2. Check cache statistics:

```sql
SELECT
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_entry,
  SUM(CASE WHEN hit_count > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as cache_hit_rate
FROM archive_searches;
```

**Expected Results:**

```
 total_entries | total_hits | avg_hits_per_entry | cache_hit_rate
---------------+------------+--------------------+----------------
 5             | 5          | 1.0                | 100.0
```

**Pass Criteria:**
- ✅ Cache hit rate = 50% (5 hits out of 10 requests)
- ✅ Hit counts tracked accurately

---

## Health & Monitoring Tests

### TEST-HEALTH-001: Basic Health Check

**Objective:** Verify /health endpoint returns quickly

**Steps:**

```bash
time curl http://localhost:3000/health
```

**Expected Results:**
- ✅ Response time < 100ms
- ✅ HTTP 200 status
- ✅ `status: "healthy"`

---

### TEST-HEALTH-002: Deep Health Check (SkyFi API)

**Objective:** Verify SkyFi API connectivity check

**Steps:**

```bash
curl http://localhost:3000/health | jq '.components.skyfi'
```

**Expected Results:**

```json
{
  "status": "healthy",
  "message": "SkyFi API is reachable",
  "responseTime": 245,
  "lastChecked": "2025-11-17T12:00:00Z"
}
```

**Pass Criteria:**
- ✅ SkyFi component healthy
- ✅ Response time < 1000ms
- ✅ No authentication errors

---

### TEST-HEALTH-003: Unhealthy State (Invalid API Key)

**Objective:** Verify health check detects invalid credentials

**Steps:**

1. Stop server
2. Edit `.env` - set invalid API key:

```bash
SKYFI_API_KEY=invalid_key_12345
```

3. Restart server
4. Check health:

```bash
curl http://localhost:3000/health | jq
```

**Expected Results:**

```json
{
  "status": "degraded",
  "components": {
    "server": {
      "status": "healthy"
    },
    "skyfi": {
      "status": "unhealthy",
      "message": "SkyFi API unreachable: Authentication failed"
    }
  }
}
```

**Pass Criteria:**
- ✅ HTTP 503 status (service unavailable)
- ✅ `status: "degraded"`
- ✅ SkyFi component unhealthy

**Cleanup:**
Restore valid API key and restart server

---

### TEST-HEALTH-004: Metrics Collection

**Objective:** Verify metrics are collected and reported

**Steps:**

1. Perform several operations (searches, tool calls)
2. Check health endpoint:

```bash
curl http://localhost:3000/health | jq '.metrics'
```

**Expected Results:**

```json
{
  "requestCount": 25,
  "errorCount": 2,
  "averageResponseTime": 450
}
```

**Pass Criteria:**
- ✅ Request count > 0
- ✅ Average response time tracked
- ✅ Error count tracked

---

### TEST-HEALTH-005: Active Transports

**Objective:** Verify active SSE connections are tracked

**Steps:**

1. Open 3 SSE connections in separate terminals:

```bash
# Terminal 1
curl -N http://localhost:3000/sse &

# Terminal 2
curl -N http://localhost:3000/sse &

# Terminal 3
curl -N http://localhost:3000/sse &
```

2. Check health:

```bash
curl http://localhost:3000/health | jq '.activeTransports'
```

**Expected Results:**

```
3
```

**Pass Criteria:**
- ✅ Active transports = 3
- ✅ Count updates when connections close

---

## Deployment Tests

### TEST-DEPLOY-001: Docker Build

**Objective:** Verify Docker image builds successfully

**Steps:**

```bash
# Build Docker image
docker build -t skyfi-mcp:test .
```

**Expected Results:**
- ✅ Build completes without errors
- ✅ Multi-stage build used
- ✅ Final image size < 200MB

**Validation:**

```bash
docker images skyfi-mcp:test
```

Expected output:
```
REPOSITORY   TAG    SIZE
skyfi-mcp    test   ~150MB
```

---

### TEST-DEPLOY-002: Docker Run

**Objective:** Verify Docker container runs

**Steps:**

```bash
# Run container
docker run -d \
  --name skyfi-mcp-test \
  -p 3000:3000 \
  -e SKYFI_API_KEY=$SKYFI_API_KEY \
  -e DATABASE_URL=$DATABASE_URL \
  skyfi-mcp:test

# Check logs
docker logs -f skyfi-mcp-test
```

**Expected Results:**
- ✅ Container starts
- ✅ Server initializes
- ✅ Health check passes

**Validation:**

```bash
# Test health check
curl http://localhost:3000/health

# Cleanup
docker stop skyfi-mcp-test
docker rm skyfi-mcp-test
```

---

### TEST-DEPLOY-003: Docker Compose

**Objective:** Verify docker-compose stack works

**Steps:**

```bash
# Start stack (MCP server + PostgreSQL)
docker-compose up -d

# Check services
docker-compose ps

# Check logs
docker-compose logs -f
```

**Expected Results:**

```
NAME              STATUS    PORTS
skyfi-mcp-web     Up        0.0.0.0:3000->3000/tcp
skyfi-mcp-db      Up        5432/tcp
```

**Pass Criteria:**
- ✅ Both services running
- ✅ Server connects to database
- ✅ Health check passes

**Validation:**

```bash
curl http://localhost:3000/health

# Cleanup
docker-compose down
```

---

### TEST-DEPLOY-004: Environment Variables

**Objective:** Verify all required env vars are documented

**Steps:**

1. Check `.env.example`:

```bash
cat .env.example
```

**Expected Variables:**
- [ ] SKYFI_API_KEY
- [ ] SKYFI_BASE_URL
- [ ] DATABASE_URL or POSTGRES_* variables
- [ ] OPENAI_API_KEY
- [ ] NODE_ENV
- [ ] PORT
- [ ] LOG_LEVEL

**Pass Criteria:**
- ✅ All required variables listed
- ✅ Example values provided
- ✅ Comments explain each variable

---

### TEST-DEPLOY-005: Production Build

**Objective:** Verify production build works

**Steps:**

```bash
# Set production environment
export NODE_ENV=production

# Build
npm run build

# Start production server
npm start
```

**Expected Results:**
- ✅ TypeScript compiles without errors
- ✅ Server starts in production mode
- ✅ Logs use `info` level (not `debug`)

**Validation:**

```bash
# Check log level
curl http://localhost:3000/health | grep -i "info"
```

---

## Performance Tests

### TEST-PERF-001: Response Time (Cache Hit)

**Objective:** Measure cache hit response time

**Steps:**

1. Warm up cache (perform search)
2. Measure response time:

```bash
# Repeat same search 10 times
for i in {1..10}; do
  time curl -X POST http://localhost:3000/message/$SESSION_ID \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_satellite_archives","arguments":{...}},"id":'$i'}' \
    > /dev/null 2>&1
done
```

**Expected Results:**
- ✅ Average response time < 200ms
- ✅ P95 response time < 300ms
- ✅ P99 response time < 500ms

---

### TEST-PERF-002: Response Time (Cache Miss)

**Objective:** Measure cache miss response time

**Steps:**

1. Clear cache
2. Perform unique searches:

```bash
for i in {1..10}; do
  # Each search has unique AOI
  time curl ... (different AOI each time)
done
```

**Expected Results:**
- ✅ Average response time < 2s
- ✅ P95 response time < 3s
- ✅ P99 response time < 5s

---

### TEST-PERF-003: Concurrent Connections

**Objective:** Verify server handles 50 concurrent SSE connections

**Steps:**

```bash
# Open 50 SSE connections
for i in {1..50}; do
  curl -N http://localhost:3000/sse > /dev/null 2>&1 &
done

# Check health
curl http://localhost:3000/health | jq '.activeTransports'

# Check server logs for errors
docker logs skyfi-mcp-test | grep ERROR
```

**Expected Results:**
- ✅ All 50 connections established
- ✅ No errors in logs
- ✅ Health check still responsive

**Cleanup:**

```bash
pkill -f "curl -N http://localhost:3000/sse"
```

---

### TEST-PERF-004: Database Connection Pool

**Objective:** Verify connection pool handles load

**Steps:**

1. Configure small pool:

```bash
export POSTGRES_MAX_CONNECTIONS=5
```

2. Perform 20 concurrent searches (requires 20 connections)
3. Verify connection pooling:

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'skyfi_mcp';
```

**Expected Results:**
- ✅ Max 5 connections to database
- ✅ Requests queue when pool is full
- ✅ No connection errors

---

### TEST-PERF-005: Memory Usage

**Objective:** Verify memory usage remains stable

**Steps:**

```bash
# Monitor memory usage
docker stats skyfi-mcp-test

# Perform 100 operations
for i in {1..100}; do
  curl ... (search request)
done

# Check memory again
docker stats skyfi-mcp-test
```

**Expected Results:**
- ✅ Memory usage < 500MB
- ✅ No memory leaks (usage stable after operations)
- ✅ Garbage collection working

---

## Security Tests

### TEST-SEC-001: API Key Not Logged

**Objective:** Verify API key never appears in logs

**Steps:**

1. Enable debug logging:

```bash
export LOG_LEVEL=debug
```

2. Restart server
3. Perform several operations
4. Check logs:

```bash
cat logs/combined.log | grep "sk_live_"
```

**Expected Results:**
- ✅ NO matches found
- ✅ API key never in logs

**Pass Criteria:**
Zero occurrences of API key in any log file

---

### TEST-SEC-002: Delivery Credentials Not Logged

**Objective:** Verify S3/GCS/Azure credentials not logged

**Steps:**

1. Attempt order with S3 delivery (dry run)
2. Check logs:

```bash
cat logs/combined.log | grep -E "(accessKeyId|secretAccessKey|private_key)"
```

**Expected Results:**
- ✅ NO matches found
- ✅ Credentials never in logs

---

### TEST-SEC-003: SQL Injection Prevention

**Objective:** Verify SQL injection is prevented

**Steps:**

1. Attempt SQL injection in cache query:

```bash
# This should NOT execute SQL
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -d '{
    "name": "search_satellite_archives",
    "arguments": {
      "aoi": "POLYGON((0 0, 0 1, 1 1, 1 0, 0 0)); DROP TABLE archive_searches;--"
    }
  }'
```

2. Check database:

```sql
\dt  -- List tables
```

**Expected Results:**
- ✅ `archive_searches` table still exists
- ✅ SQL injection blocked
- ✅ Parameterized queries used

---

### TEST-SEC-004: Input Validation

**Objective:** Verify Zod validation prevents malicious input

**Steps:**

```bash
# Attempt XSS attack
curl -X POST http://localhost:3000/message/$SESSION_ID \
  -d '{
    "name": "search_satellite_archives",
    "arguments": {
      "aoi": "<script>alert(1)</script>"
    }
  }'
```

**Expected Results:**
- ✅ Validation error returned
- ✅ Script not executed
- ✅ Clear error message

---

### TEST-SEC-005: Environment Variable Security

**Objective:** Verify .env file is gitignored

**Steps:**

```bash
# Check .gitignore
cat .gitignore | grep "\.env"

# Verify .env not in git
git ls-files | grep "\.env$"
```

**Expected Results:**
- ✅ `.env` in `.gitignore`
- ✅ `.env` NOT in git repository
- ✅ Only `.env.example` committed

---

## Test Results Template

### Test Execution Summary

**Date:** _______________
**Tester:** _______________
**Version:** _______________
**Environment:** Development / Staging / Production

---

### Test Results

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| TEST-MCP-001 | Server Startup | ☐ Pass ☐ Fail | |
| TEST-MCP-002 | Health Check | ☐ Pass ☐ Fail | |
| TEST-MCP-003 | SSE Connection | ☐ Pass ☐ Fail | |
| TEST-MCP-004 | List Tools | ☐ Pass ☐ Fail | |
| TEST-TOOL-001 | Search Archives (Success) | ☐ Pass ☐ Fail | |
| TEST-TOOL-002 | Search Archives (Validation) | ☐ Pass ☐ Fail | |
| TEST-TOOL-003 | Search Archives (Filter) | ☐ Pass ☐ Fail | |
| TEST-TOOL-004 | Get Archive Details | ☐ Pass ☐ Fail | |
| TEST-TOOL-005 | Check Feasibility | ☐ Pass ☐ Fail | |
| TEST-TOOL-006 | Predict Passes | ☐ Pass ☐ Fail | |
| TEST-TOOL-007 | Get Pricing | ☐ Pass ☐ Fail | |
| TEST-TOOL-008 | Order Archive (Dry Run) | ☐ Pass ☐ Fail | |
| TEST-TOOL-009 | List Orders | ☐ Pass ☐ Fail | |
| TEST-TOOL-010 | Create Notification | ☐ Pass ☐ Fail | |
| TEST-TOOL-011 | List Notifications | ☐ Pass ☐ Fail | |
| TEST-TOOL-012 | Delete Notification | ☐ Pass ☐ Fail | |
| TEST-AGENT-001 | Agent Startup | ☐ Pass ☐ Fail | |
| TEST-AGENT-002 | Simple Search | ☐ Pass ☐ Fail | |
| TEST-AGENT-003 | Multi-Step Workflow | ☐ Pass ☐ Fail | |
| TEST-AGENT-004 | Error Handling | ☐ Pass ☐ Fail | |
| TEST-AGENT-005 | Cost Tracking | ☐ Pass ☐ Fail | |
| TEST-CACHE-001 | First Request | ☐ Pass ☐ Fail | |
| TEST-CACHE-002 | Cache Hit | ☐ Pass ☐ Fail | |
| TEST-CACHE-003 | Cache Expiration | ☐ Pass ☐ Fail | |
| TEST-CACHE-004 | Orders Cache | ☐ Pass ☐ Fail | |
| TEST-CACHE-005 | Hit Rate Monitoring | ☐ Pass ☐ Fail | |
| TEST-HEALTH-001 | Basic Health | ☐ Pass ☐ Fail | |
| TEST-HEALTH-002 | Deep Health | ☐ Pass ☐ Fail | |
| TEST-HEALTH-003 | Unhealthy State | ☐ Pass ☐ Fail | |
| TEST-HEALTH-004 | Metrics Collection | ☐ Pass ☐ Fail | |
| TEST-HEALTH-005 | Active Transports | ☐ Pass ☐ Fail | |
| TEST-DEPLOY-001 | Docker Build | ☐ Pass ☐ Fail | |
| TEST-DEPLOY-002 | Docker Run | ☐ Pass ☐ Fail | |
| TEST-DEPLOY-003 | Docker Compose | ☐ Pass ☐ Fail | |
| TEST-DEPLOY-004 | Environment Variables | ☐ Pass ☐ Fail | |
| TEST-DEPLOY-005 | Production Build | ☐ Pass ☐ Fail | |
| TEST-PERF-001 | Response Time (Cache Hit) | ☐ Pass ☐ Fail | |
| TEST-PERF-002 | Response Time (Cache Miss) | ☐ Pass ☐ Fail | |
| TEST-PERF-003 | Concurrent Connections | ☐ Pass ☐ Fail | |
| TEST-PERF-004 | Connection Pool | ☐ Pass ☐ Fail | |
| TEST-PERF-005 | Memory Usage | ☐ Pass ☐ Fail | |
| TEST-SEC-001 | API Key Not Logged | ☐ Pass ☐ Fail | |
| TEST-SEC-002 | Credentials Not Logged | ☐ Pass ☐ Fail | |
| TEST-SEC-003 | SQL Injection Prevention | ☐ Pass ☐ Fail | |
| TEST-SEC-004 | Input Validation | ☐ Pass ☐ Fail | |
| TEST-SEC-005 | Environment Security | ☐ Pass ☐ Fail | |

---

### Summary Statistics

**Total Tests:** 45
**Passed:** ___
**Failed:** ___
**Skipped:** ___
**Pass Rate:** ___%

---

### Critical Issues Found

1. ____________________________________
2. ____________________________________
3. ____________________________________

---

### Recommendations

1. ____________________________________
2. ____________________________________
3. ____________________________________

---

### Sign-Off

**QA Lead:** _______________ **Date:** ___________
**Developer:** _______________ **Date:** ___________
**Product Manager:** _______________ **Date:** ___________

---

**Last Updated:** 2025-11-17
**Document Owner:** QA Team
