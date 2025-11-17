# SkyFi MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)

AI-powered satellite imagery ordering through the Model Context Protocol (MCP). Enable autonomous AI agents to seamlessly interact with SkyFi's geospatial satellite imagery services.

## Overview

SkyFi MCP is a Model Context Protocol server that exposes SkyFi's public API as MCP tools, allowing AI agents to search, order, and manage satellite imagery through natural conversation. The system includes a polished demo agent showcasing conversational interaction patterns for satellite imagery ordering and exploration.

### Key Features

- **13 MCP Tools** - Complete coverage of SkyFi's public API
  - Archive search and ordering
  - Satellite tasking with feasibility checks
  - Order management and tracking
  - AOI-based monitoring and notifications
  - Pricing exploration
  - Satellite pass predictions

- **Demo AI Agent** - Conversational interface powered by OpenAI
  - Natural language ordering
  - Price confirmation flows
  - Order status tracking
  - Research and exploration capabilities

- **Production Ready**
  - HTTP + SSE transport for stateless operation
  - PostgreSQL caching layer with 24-hour TTL
  - Health checks and monitoring
  - Docker and docker-compose support
  - AWS ECS Fargate deployment configuration

- **Developer Friendly**
  - Full TypeScript implementation
  - Comprehensive test coverage (unit, integration, E2E)
  - OpenAPI documentation
  - Extensive logging with Winston
  - Hot reload for development

## Quick Start

### Prerequisites

- Node.js 20.0.0 or higher
- Docker and Docker Compose (for local development)
- SkyFi API key ([get one here](https://www.skyfi.com/developers))
- OpenAI API key (for demo agent)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/skyfi-mcp.git
cd skyfi-mcp

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env  # or use your preferred editor
```

### Running with Docker Compose (Recommended)

```bash
# Start all services (PostgreSQL + MCP Server)
docker-compose up -d

# View logs
docker-compose logs -f mcp-server

# Check health
curl http://localhost:3000/health

# Run the demo agent
npm run dev
```

### Running Locally

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
npm run migrate:up

# Start the MCP server in development mode
npm run dev

# In another terminal, run the demo agent
npm run agent
```

The MCP server will be available at:
- **Health endpoint**: http://localhost:3000/health
- **SSE endpoint**: http://localhost:3000/sse
- **Message endpoint**: http://localhost:3000/message

## Architecture

```
┌─────────────────┐
│   AI Agent      │
│  (OpenAI GPT)   │
└────────┬────────┘
         │ MCP Protocol
         │ (HTTP + SSE)
         ▼
┌─────────────────┐      ┌──────────────┐
│  SkyFi MCP      │◄────►│  PostgreSQL  │
│     Server      │      │   (Cache)    │
└────────┬────────┘      └──────────────┘
         │
         │ REST API
         ▼
┌─────────────────┐
│   SkyFi API     │
│ (Satellite Data)│
└─────────────────┘
```

### Components

- **MCP Server** - Exposes 13 tools via Model Context Protocol
- **Demo Agent** - Example conversational AI using the MCP server
- **PostgreSQL** - Caching layer for archive search results
- **SkyFi API** - Backend satellite imagery service

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_archives` | Search satellite imagery archive by AOI, date, resolution |
| `get_archive` | Get detailed information about a specific archive image |
| `order_archive` | Place an order for archive imagery |
| `order_tasking` | Order new satellite tasking |
| `check_feasibility` | Check if tasking is feasible for an AOI |
| `predict_passes` | Get satellite pass predictions |
| `get_pricing` | Get pricing for imagery orders |
| `list_orders` | List all orders |
| `get_order` | Get detailed order information |
| `redelivery` | Trigger redelivery of completed orders |
| `create_notification` | Set up AOI monitoring notifications |
| `list_notifications` | List all active notifications |
| `delete_notification` | Delete a notification |

## Documentation

- **[Getting Started](docs/getting-started.md)** - Detailed setup and installation guide
- **[Configuration](docs/configuration.md)** - Environment variables and configuration options
- **[Local Development](docs/local-development.md)** - Development workflow and testing
- **[Deployment](docs/deployment.md)** - AWS ECS deployment guide
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[API Reference](docs/openapi.json)** - OpenAPI specification

## Example Usage

```typescript
// Example: Search for recent high-resolution imagery of San Francisco
const tools = await mcpClient.listTools();
const searchTool = tools.find(t => t.name === 'search_archives');

const result = await mcpClient.callTool({
  name: 'search_archives',
  arguments: {
    aoi: 'POLYGON((-122.4194 37.7749, -122.4194 37.8049, -122.3894 37.8049, -122.3894 37.7749, -122.4194 37.7749))',
    start_date: '2025-01-01T00:00:00Z',
    end_date: '2025-11-17T00:00:00Z',
    resolution: 'HIGH',
    product_type: 'DAY'
  }
});

console.log(result.content);
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## Development Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm run start

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check

# Database migrations
npm run migrate:up
npm run migrate:down
npm run migrate:status
```

## Environment Variables

Key environment variables (see [Configuration Guide](docs/configuration.md) for complete reference):

```bash
# Required
SKYFI_API_KEY=your_skyfi_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional (with defaults)
NODE_ENV=development
PORT=3000
SKYFI_API_BASE_URL=https://api.skyfi.com/v1
ENABLE_CACHE=true
CACHE_TTL_HOURS=24
```

## Deployment

Deploy to AWS ECS Fargate:

```bash
cd infrastructure
./deploy.sh --account-id YOUR_AWS_ACCOUNT_ID --region us-east-1
```

See the [Deployment Guide](docs/deployment.md) for detailed instructions.

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Follow the existing TypeScript style
- Use ESLint and Prettier (configs provided)
- Write tests for new features
- Update documentation as needed

## Resources

- **[Model Context Protocol](https://modelcontextprotocol.io/)** - MCP specification
- **[SkyFi API Documentation](https://www.skyfi.com/developers)** - SkyFi platform docs
- **[OpenAI API](https://platform.openai.com/docs)** - OpenAI API reference

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/skyfi-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/skyfi-mcp/discussions)
- **Email**: support@skyfi.com

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Powered by [SkyFi](https://www.skyfi.com/) satellite imagery platform
- Demo agent uses [OpenAI GPT-4](https://openai.com/)

---

Made with ❤️ by the SkyFi MCP Team
