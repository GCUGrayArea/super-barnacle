# Getting Started with SkyFi MCP

This guide will walk you through setting up the SkyFi MCP server and demo agent from scratch.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Starting the MCP Server](#starting-the-mcp-server)
- [Verifying Installation](#verifying-installation)
- [Running the Demo Agent](#running-the-demo-agent)
- [First Tool Call Example](#first-tool-call-example)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have the following installed and configured:

### Required Software

1. **Node.js 20.0.0 or higher**
   ```bash
   # Check your Node.js version
   node --version

   # Should output v20.0.0 or higher
   ```

   If you need to install or upgrade Node.js, visit [nodejs.org](https://nodejs.org/) or use a version manager like [nvm](https://github.com/nvm-sh/nvm):
   ```bash
   # Using nvm
   nvm install 20
   nvm use 20
   ```

2. **Docker and Docker Compose**
   ```bash
   # Check Docker installation
   docker --version
   docker-compose --version
   ```

   If not installed, follow the [Docker installation guide](https://docs.docker.com/get-docker/).

3. **Git**
   ```bash
   git --version
   ```

### Required API Keys

You'll need API keys from two services:

1. **SkyFi API Key**
   - Sign up at [skyfi.com](https://www.skyfi.com/)
   - Navigate to [Developer Settings](https://www.skyfi.com/developers)
   - Generate a new API key
   - Copy and save it securely

2. **OpenAI API Key** (for demo agent)
   - Create an account at [platform.openai.com](https://platform.openai.com/)
   - Go to [API Keys](https://platform.openai.com/api-keys)
   - Create a new secret key
   - Copy and save it securely
   - Ensure you have credits available

## Installation

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/skyfi-mcp.git
cd skyfi-mcp
```

### Step 2: Install Dependencies

```bash
# Install all npm dependencies
npm install
```

This will install:
- Runtime dependencies (MCP SDK, axios, pg, winston, etc.)
- Development dependencies (TypeScript, Jest, ESLint, etc.)

The installation should complete without errors. If you encounter issues, see the [Troubleshooting Guide](troubleshooting.md).

## Environment Configuration

### Step 1: Copy Environment Template

```bash
# Copy the example environment file
cp .env.example .env
```

### Step 2: Edit Environment Variables

Open the `.env` file in your preferred editor:

```bash
# Using nano
nano .env

# Or using vim
vim .env

# Or using VS Code
code .env
```

### Step 3: Configure Required Variables

Update the following **required** variables with your actual API keys:

```bash
# SkyFi API Configuration
SKYFI_API_KEY=your_actual_skyfi_api_key_here

# OpenAI Configuration (for demo agent)
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### Step 4: Review Optional Variables

The following variables have sensible defaults but can be customized:

```bash
# Server Configuration
NODE_ENV=development          # development | production
PORT=3000                     # MCP server port
LOG_LEVEL=debug              # error | warn | info | debug

# Database Configuration
POSTGRES_PASSWORD=skyfi_dev_password  # Change in production!
ENABLE_CACHE=true            # Enable PostgreSQL caching
CACHE_TTL_HOURS=24          # Cache expiration time

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

See the [Configuration Guide](configuration.md) for detailed information about all environment variables.

## Database Setup

The SkyFi MCP server uses PostgreSQL for caching archive search results.

### Option 1: Using Docker Compose (Recommended)

Start PostgreSQL using Docker Compose:

```bash
# Start PostgreSQL service
docker-compose up -d postgres

# Verify it's running
docker-compose ps

# Check logs
docker-compose logs postgres
```

You should see output indicating PostgreSQL is ready to accept connections.

### Option 2: Using External PostgreSQL

If you have an existing PostgreSQL instance:

1. Create a database:
   ```sql
   CREATE DATABASE skyfi_mcp;
   CREATE USER skyfi WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE skyfi_mcp TO skyfi;
   ```

2. Update your `.env` file:
   ```bash
   DATABASE_URL=postgresql://skyfi:your_password@localhost:5432/skyfi_mcp
   ```

### Run Database Migrations

Once PostgreSQL is running, initialize the database schema:

```bash
# Run all migrations
npm run migrate:up

# Check migration status
npm run migrate:status
```

Expected output:
```
[INFO] Running migrations...
[INFO] Migration 001_create_cache_table.sql applied successfully
[INFO] All migrations completed
```

## Starting the MCP Server

You have two options for running the MCP server:

### Option 1: Using Docker Compose (Recommended for Development)

Start all services (PostgreSQL + MCP Server):

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f mcp-server

# Stop all services
docker-compose down
```

### Option 2: Running Locally with Node.js

Start the server in development mode with hot reload:

```bash
# Start development server
npm run dev
```

Expected output:
```
[INFO] SkyFi MCP Server - Starting...
[INFO] Environment { nodeEnv: 'development', nodeVersion: 'v20.10.0' }
[INFO] Database connected successfully
[INFO] Registered 13 MCP tools
[INFO] SkyFi MCP Server - Ready {
  port: 3000,
  sseEndpoint: '/sse',
  messageEndpoint: '/message',
  healthEndpoint: '/health'
}
```

### Option 3: Production Build

For production deployment:

```bash
# Build TypeScript
npm run build

# Start production server
npm run start
```

## Verifying Installation

### 1. Check Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "name": "skyfi-mcp-server",
  "version": "1.0.0",
  "timestamp": "2025-11-17T10:00:00.000Z",
  "uptime": 123.45,
  "database": {
    "connected": true
  },
  "cache": {
    "enabled": true,
    "ttl_hours": 24
  }
}
```

### 2. Verify Database Connection

```bash
# Check PostgreSQL is accessible
docker-compose exec postgres psql -U skyfi -d skyfi_mcp -c "\dt"
```

Expected output should show the `cache` table.

### 3. Check Available Tools

The MCP server exposes 13 tools. You can verify them by checking the logs when the server starts.

## Running the Demo Agent

The demo agent is a conversational AI that showcases the SkyFi MCP capabilities.

### Start the Demo Agent

```bash
# Make sure the MCP server is running first!
# Then in a new terminal:
npm run agent
```

### Example Conversation

```
SkyFi Agent: Hello! I'm your SkyFi satellite imagery assistant.
I can help you search for satellite images, order imagery,
check pricing, and more. What would you like to do?

You: Search for recent high-resolution images of San Francisco

SkyFi Agent: I'll search for recent high-resolution imagery of
San Francisco. Let me query the archive...

[The agent will call the search_archives tool]

SkyFi Agent: I found 12 high-resolution images of San Francisco
from the past 30 days. Here are the top 3 results:

1. Captured: 2025-11-15 | Resolution: 0.5m | Cloud: 5% | Price: $150
2. Captured: 2025-11-12 | Resolution: 0.5m | Cloud: 10% | Price: $150
3. Captured: 2025-11-08 | Resolution: 0.5m | Cloud: 2% | Price: $150

Would you like details about any of these, or would you like to
place an order?
```

## First Tool Call Example

Here's a simple example of calling the `get_pricing` tool directly:

### Using curl (HTTP Transport)

```bash
# Send a tool call request
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_pricing",
      "arguments": {
        "product_type": "DAY",
        "resolution": "HIGH"
      }
    }
  }'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Pricing for DAY imagery at HIGH resolution:\n- Base price: $100/sqkm\n- Minimum order: $50\n- Rush delivery: +50%"
      }
    ]
  }
}
```

### Using the TypeScript Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Create MCP client
const transport = new SSEClientTransport(
  new URL('http://localhost:3000/sse')
);
const client = new Client({ name: 'skyfi-test', version: '1.0.0' });
await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools.tools.map(t => t.name));

// Call a tool
const result = await client.callTool({
  name: 'get_pricing',
  arguments: {
    product_type: 'DAY',
    resolution: 'HIGH'
  }
});

console.log('Result:', result.content);

// Close connection
await client.close();
```

## Next Steps

Congratulations! You now have a working SkyFi MCP server. Here are some suggested next steps:

### 1. Explore the Tools

Try out different MCP tools:
- `search_archives` - Search for satellite imagery
- `check_feasibility` - Check if tasking is possible for an area
- `predict_passes` - Get satellite pass predictions
- `get_pricing` - Get pricing information

### 2. Learn More

- Read the [Configuration Guide](configuration.md) to understand all available options
- Check out [Local Development](local-development.md) for development workflows
- Review the [API Documentation](openapi.json) for detailed tool schemas

### 3. Build Your Own Agent

Use the demo agent as a starting point to build your own custom AI agent:

```bash
# Copy the agent code
cp -r src/agent src/my-agent

# Customize the prompts and conversation flow
# See src/agent/prompts.ts for examples
```

### 4. Deploy to Production

When you're ready to deploy:
- Review the [Deployment Guide](deployment.md)
- Follow the [AWS ECS setup instructions](deployment.md#aws-ecs-deployment)
- Configure monitoring and logging

## Common Setup Issues

If you encounter problems, check the [Troubleshooting Guide](troubleshooting.md) for solutions to common issues:

- [Database connection failures](troubleshooting.md#database-connection-failures)
- [API key errors](troubleshooting.md#api-key-issues)
- [Docker build failures](troubleshooting.md#docker-build-failures)
- [TypeScript compilation errors](troubleshooting.md#typescript-compilation-errors)

## Getting Help

If you're stuck:

1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review the [FAQ](#) (coming soon)
3. Search [GitHub Issues](https://github.com/your-org/skyfi-mcp/issues)
4. Ask in [GitHub Discussions](https://github.com/your-org/skyfi-mcp/discussions)
5. Contact support at support@skyfi.com

---

[← Back to README](../README.md) | [Next: Configuration Guide →](configuration.md)
