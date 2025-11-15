# Docker Setup for SkyFi MCP

This document provides instructions for running SkyFi MCP using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose v2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` and set the required values:
- `SKYFI_API_KEY`: Your SkyFi API key (required)
- `OPENAI_API_KEY`: Your OpenAI API key (required for demo agent)
- `POSTGRES_PASSWORD`: Database password (change in production!)

### 2. Start Development Environment

Start all services (MCP server + PostgreSQL):

```bash
docker-compose up -d
```

View logs:

```bash
docker-compose logs -f mcp-server
```

### 3. Access Services

- **MCP Server**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **PostgreSQL**: localhost:5432 (accessible with credentials from .env)

Optional pgAdmin (database management UI):

```bash
docker-compose --profile tools up -d pgadmin
```

Access pgAdmin at http://localhost:5050

### 4. Stop Services

```bash
docker-compose down
```

To remove volumes (database data):

```bash
docker-compose down -v
```

## Production-Like Testing

For production-like local testing:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This configuration:
- Uses production environment settings
- Doesn't mount source code
- Includes resource limits
- Uses higher log levels (info instead of debug)
- Doesn't expose PostgreSQL port externally

## Docker Commands

### Build Image

```bash
docker build -t skyfi-mcp:latest .
```

### Run Container Standalone

```bash
docker run -d \
  --name skyfi-mcp-server \
  -p 3000:3000 \
  -e SKYFI_API_KEY=your_api_key \
  -e OPENAI_API_KEY=your_openai_key \
  skyfi-mcp:latest
```

### View Logs

```bash
# All services
docker-compose logs -f

# MCP server only
docker-compose logs -f mcp-server

# PostgreSQL only
docker-compose logs -f postgres
```

### Execute Commands in Container

```bash
# Open shell in running container
docker-compose exec mcp-server sh

# Run npm commands
docker-compose exec mcp-server npm test
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build
```

## Image Optimization

The Dockerfile uses multi-stage builds to minimize the final image size:

1. **Builder stage**: Installs dependencies, compiles TypeScript
2. **Production stage**: Copies only necessary files, runs as non-root user

Expected production image size: **< 200MB**

Check image size:

```bash
docker images skyfi-mcp
```

## Health Checks

The container includes health checks that verify the server is responding:

- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Start period**: 40 seconds
- **Retries**: 3

Check health status:

```bash
docker-compose ps
```

## Security Features

- ✅ Runs as non-root user (nodejs:1001)
- ✅ Uses Alpine Linux (minimal attack surface)
- ✅ Multi-stage build (no build tools in production image)
- ✅ Health checks for service monitoring
- ✅ Environment variables for secrets (never hardcoded)

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs mcp-server
```

### Database connection issues

Ensure PostgreSQL is healthy:
```bash
docker-compose ps postgres
```

Check database logs:
```bash
docker-compose logs postgres
```

### Build cache issues

Clear build cache and rebuild:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port already in use

Change ports in docker-compose.yml or .env:
```yaml
ports:
  - "3001:3000"  # Use port 3001 instead
```

## Development Workflow

For active development with hot reload:

1. Install dependencies locally:
   ```bash
   npm install
   ```

2. Start services:
   ```bash
   docker-compose up -d
   ```

3. Run TypeScript compiler in watch mode:
   ```bash
   npm run build:watch
   ```

The `docker-compose.yml` mounts the `dist` directory, so rebuilds will be reflected automatically.

## Production Deployment

For AWS ECS Fargate deployment, see:
- `infrastructure/ecs-task-definition.json` (coming in PR-023)
- `docs/deployment.md` (coming in PR-031)

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
