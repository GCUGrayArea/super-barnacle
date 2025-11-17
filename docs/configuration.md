# Configuration Guide

This guide documents all configuration options for the SkyFi MCP server.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Server Configuration](#server-configuration)
- [SkyFi API Configuration](#skyfi-api-configuration)
- [OpenAI Configuration](#openai-configuration)
- [Database Configuration](#database-configuration)
- [Cache Configuration](#cache-configuration)
- [Rate Limiting](#rate-limiting)
- [Logging Configuration](#logging-configuration)
- [Development Tools](#development-tools)
- [Example .env File](#example-env-file)
- [Security Best Practices](#security-best-practices)

## Environment Variables

All configuration is managed through environment variables. The server loads these from a `.env` file in the project root using [dotenv](https://github.com/motdotla/dotenv).

### Quick Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Runtime environment |
| `PORT` | No | `3000` | HTTP server port |
| `LOG_LEVEL` | No | `debug` | Logging verbosity |
| `SKYFI_API_KEY` | **Yes** | - | SkyFi API authentication key |
| `SKYFI_API_BASE_URL` | No | `https://api.skyfi.com/v1` | SkyFi API base URL |
| `OPENAI_API_KEY` | **Yes*** | - | OpenAI API key (for demo agent) |
| `DATABASE_URL` | No | Auto-configured | PostgreSQL connection string |
| `POSTGRES_PASSWORD` | No | `skyfi_dev_password` | PostgreSQL password |
| `ENABLE_CACHE` | No | `true` | Enable database caching |
| `CACHE_TTL_HOURS` | No | `24` | Cache expiration in hours |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in ms |
| `PGADMIN_EMAIL` | No | `admin@skyfi.local` | pgAdmin login email |
| `PGADMIN_PASSWORD` | No | `admin` | pgAdmin password |

**\* Required only for demo agent**

## Server Configuration

### NODE_ENV

**Type**: `string`
**Default**: `development`
**Options**: `development`, `production`, `test`

Controls the runtime environment and affects:
- Logging verbosity
- Error stack traces
- Performance optimizations
- CORS policies

```bash
# Development (verbose logging, detailed errors)
NODE_ENV=development

# Production (optimized, minimal logging)
NODE_ENV=production

# Test (for running automated tests)
NODE_ENV=test
```

### PORT

**Type**: `number`
**Default**: `3000`

The HTTP port the MCP server listens on.

```bash
PORT=3000
```

The server will be accessible at:
- Health endpoint: `http://localhost:3000/health`
- SSE endpoint: `http://localhost:3000/sse`
- Message endpoint: `http://localhost:3000/message`

### LOG_LEVEL

**Type**: `string`
**Default**: `debug` (development), `info` (production)
**Options**: `error`, `warn`, `info`, `debug`

Controls logging verbosity using Winston logger.

```bash
# Show only errors
LOG_LEVEL=error

# Show errors and warnings
LOG_LEVEL=warn

# Show info, warnings, and errors
LOG_LEVEL=info

# Show all logs including debug info
LOG_LEVEL=debug
```

**Level Hierarchy** (from least to most verbose):
- `error`: Critical errors only
- `warn`: Warnings and errors
- `info`: General information, warnings, and errors
- `debug`: Detailed debugging information (includes all levels)

## SkyFi API Configuration

### SKYFI_API_KEY

**Type**: `string`
**Required**: **Yes**

Your SkyFi API authentication key. Obtain from [skyfi.com/developers](https://www.skyfi.com/developers).

```bash
SKYFI_API_KEY=sk_live_abc123xyz789...
```

**Security Notes**:
- Never commit this to version control
- Rotate regularly in production
- Use different keys for development and production
- Store in AWS Secrets Manager for production deployments

### SKYFI_API_BASE_URL

**Type**: `string`
**Default**: `https://api.skyfi.com/v1`

The base URL for the SkyFi API. Typically only changed for:
- Testing against a staging environment
- Using a proxy
- Local development with mock servers

```bash
# Production (default)
SKYFI_API_BASE_URL=https://api.skyfi.com/v1

# Staging
SKYFI_API_BASE_URL=https://api.staging.skyfi.com/v1

# Local mock server
SKYFI_API_BASE_URL=http://localhost:8080/v1
```

## OpenAI Configuration

### OPENAI_API_KEY

**Type**: `string`
**Required**: **Yes** (for demo agent only)

Your OpenAI API key for the demo agent. Obtain from [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

```bash
OPENAI_API_KEY=sk-proj-abc123xyz789...
```

**Notes**:
- Only required if you want to run the demo agent
- Not needed for the MCP server itself
- Ensure you have sufficient credits
- Monitor usage to control costs

**Security Notes**:
- Never commit this to version control
- Store in AWS Secrets Manager for production
- Set up billing limits in OpenAI dashboard
- Use organization-level keys for teams

## Database Configuration

### DATABASE_URL

**Type**: `string`
**Default**: Auto-configured from docker-compose

Full PostgreSQL connection string.

```bash
# Standard format
DATABASE_URL=postgresql://username:password@host:port/database

# Example with docker-compose
DATABASE_URL=postgresql://skyfi:skyfi_dev_password@localhost:5432/skyfi_mcp

# Production example
DATABASE_URL=postgresql://skyfi:secure_password@db.example.com:5432/skyfi_mcp

# With SSL
DATABASE_URL=postgresql://skyfi:password@db.example.com:5432/skyfi_mcp?sslmode=require
```

**Auto-configuration**: When using docker-compose, this is automatically set based on the service configuration.

### POSTGRES_PASSWORD

**Type**: `string`
**Default**: `skyfi_dev_password`

Password for the PostgreSQL user. Used by docker-compose to initialize the database.

```bash
# Development
POSTGRES_PASSWORD=skyfi_dev_password

# Production (use a strong password)
POSTGRES_PASSWORD=your_secure_random_password_here
```

**Security Notes**:
- **MUST** be changed in production
- Use a strong, randomly generated password
- Store in AWS Secrets Manager for production
- Never use default password in production

## Cache Configuration

### ENABLE_CACHE

**Type**: `boolean`
**Default**: `true`

Enable or disable the PostgreSQL caching layer for archive search results.

```bash
# Enable caching (recommended)
ENABLE_CACHE=true

# Disable caching
ENABLE_CACHE=false
```

**Benefits of caching**:
- Reduced API calls to SkyFi
- Faster response times for repeated queries
- Lower costs from API rate limiting
- Better user experience

**When to disable**:
- During development/debugging
- When you need real-time data
- Memory-constrained environments

### CACHE_TTL_HOURS

**Type**: `number`
**Default**: `24`

Cache time-to-live in hours. Cached results expire after this duration.

```bash
# 1 hour (for frequently changing data)
CACHE_TTL_HOURS=1

# 24 hours (default, good balance)
CACHE_TTL_HOURS=24

# 7 days (for relatively static data)
CACHE_TTL_HOURS=168
```

**Considerations**:
- Lower TTL: More fresh data, more API calls
- Higher TTL: Less fresh data, fewer API calls, lower costs
- Archive imagery rarely changes, so 24+ hours is reasonable
- New tasking data should use lower TTL or disable cache

## Rate Limiting

### RATE_LIMIT_MAX_REQUESTS

**Type**: `number`
**Default**: `100`

Maximum number of requests allowed per time window.

```bash
# Conservative (100 requests/minute)
RATE_LIMIT_MAX_REQUESTS=100

# Generous (1000 requests/minute)
RATE_LIMIT_MAX_REQUESTS=1000

# Strict (10 requests/minute)
RATE_LIMIT_MAX_REQUESTS=10
```

### RATE_LIMIT_WINDOW_MS

**Type**: `number`
**Default**: `60000` (1 minute)

Time window for rate limiting in milliseconds.

```bash
# 1 minute
RATE_LIMIT_WINDOW_MS=60000

# 10 seconds
RATE_LIMIT_WINDOW_MS=10000

# 1 hour
RATE_LIMIT_WINDOW_MS=3600000
```

**Effective rate calculation**:
```
Rate = RATE_LIMIT_MAX_REQUESTS / (RATE_LIMIT_WINDOW_MS / 1000) requests/second
```

Examples:
- `100 requests / 60s = 1.67 requests/second`
- `1000 requests / 60s = 16.67 requests/second`

## Logging Configuration

The server uses [Winston](https://github.com/winstonjs/winston) for structured logging.

### Log Format

```json
{
  "level": "info",
  "message": "Server started",
  "timestamp": "2025-11-17T10:00:00.000Z",
  "service": "skyfi-mcp",
  "metadata": {
    "port": 3000
  }
}
```

### Log Destinations

**Development**:
- Console (colorized, formatted)
- `logs/combined.log` (all levels)
- `logs/error.log` (errors only)

**Production**:
- Console (JSON format)
- CloudWatch Logs (if configured)

### Customizing Logs

Modify `src/lib/logger.ts` to customize:
- Log format
- Destinations
- Metadata
- Filters

## Development Tools

### PGADMIN_EMAIL

**Type**: `string`
**Default**: `admin@skyfi.local`

Email for pgAdmin login (development only).

```bash
PGADMIN_EMAIL=admin@skyfi.local
```

### PGADMIN_PASSWORD

**Type**: `string`
**Default**: `admin`

Password for pgAdmin login (development only).

```bash
PGADMIN_PASSWORD=admin
```

**Access pgAdmin**:
1. Start with profile: `docker-compose --profile tools up -d`
2. Open http://localhost:5050
3. Login with configured credentials
4. Add server: host=`postgres`, user=`skyfi`, password=`POSTGRES_PASSWORD`

## Example .env File

### Development

```bash
# ============================================================================
# SkyFi MCP Server - Development Configuration
# ============================================================================

# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# SkyFi API Configuration
SKYFI_API_KEY=sk_test_abc123xyz789...
SKYFI_API_BASE_URL=https://api.skyfi.com/v1

# OpenAI Configuration (for demo agent)
OPENAI_API_KEY=sk-proj-abc123xyz789...

# Database Configuration
POSTGRES_PASSWORD=skyfi_dev_password
# DATABASE_URL is auto-configured by docker-compose

# Cache Configuration
ENABLE_CACHE=true
CACHE_TTL_HOURS=24

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# pgAdmin (Development Only)
PGADMIN_EMAIL=admin@skyfi.local
PGADMIN_PASSWORD=admin
```

### Production

```bash
# ============================================================================
# SkyFi MCP Server - Production Configuration
# ============================================================================

# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# SkyFi API Configuration
SKYFI_API_KEY=${SKYFI_API_KEY}  # From AWS Secrets Manager
SKYFI_API_BASE_URL=https://api.skyfi.com/v1

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}  # From AWS Secrets Manager

# Database Configuration (RDS)
DATABASE_URL=${DATABASE_URL}  # From AWS Secrets Manager

# Cache Configuration
ENABLE_CACHE=true
CACHE_TTL_HOURS=24

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
```

## Security Best Practices

### 1. API Key Management

**Development**:
```bash
# Use test/sandbox keys
SKYFI_API_KEY=sk_test_...
OPENAI_API_KEY=sk-proj-test...
```

**Production**:
```bash
# Use AWS Secrets Manager
# Never hardcode production keys
# Reference: infrastructure/secrets-manager.tf
```

### 2. Environment Separation

Maintain separate `.env` files:

```bash
# Different files for different environments
.env.development
.env.staging
.env.production

# Load specific environment
NODE_ENV=production node -r dotenv/config dist/index.js dotenv_config_path=.env.production
```

### 3. .gitignore Configuration

Ensure your `.gitignore` includes:

```gitignore
# Environment files
.env
.env.*
!.env.example

# Logs
logs/
*.log

# Secrets
secrets/
*.key
*.pem
```

### 4. Password Strength

For production databases:

```bash
# Generate strong password (example)
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Use password manager or secrets service
# Never use default passwords in production
```

### 5. Principle of Least Privilege

Grant only necessary permissions:

```bash
# Database user should only access its own database
# API keys should have minimal required scopes
# IAM roles should follow least privilege
```

### 6. Secret Rotation

Regularly rotate secrets:
- API keys: Every 90 days
- Database passwords: Every 180 days
- Service credentials: Every 30-90 days

### 7. Monitoring

Monitor for suspicious activity:
- Unusual API usage patterns
- Failed authentication attempts
- Unexpected error rates
- Abnormal resource consumption

## Configuration Validation

The server validates configuration on startup. If required variables are missing or invalid, it will exit with an error:

```bash
[ERROR] Configuration validation failed
[ERROR] Missing required environment variable: SKYFI_API_KEY
[ERROR] Please check your .env file and ensure all required variables are set
```

To manually validate configuration:

```bash
# Check if all required variables are set
npm run typecheck

# Test configuration loading
npm run dev
# Look for "Configuration loaded successfully" in logs
```

## Environment-Specific Overrides

You can override specific variables per environment:

```bash
# Start with production config but override port
NODE_ENV=production PORT=8080 npm start

# Use staging API with development config
SKYFI_API_BASE_URL=https://api.staging.skyfi.com/v1 npm run dev
```

## Configuration via Code

For advanced use cases, you can configure via code in `src/config.ts`:

```typescript
export const config = {
  server: {
    env: process.env['NODE_ENV'] || 'development',
    port: parseInt(process.env['PORT'] || '3000', 10),
    logLevel: process.env['LOG_LEVEL'] || 'debug',
  },
  skyfi: {
    apiKey: process.env['SKYFI_API_KEY'] || '',
    baseUrl: process.env['SKYFI_API_BASE_URL'] || 'https://api.skyfi.com/v1',
  },
  // ... more config
};
```

## Troubleshooting Configuration Issues

### Issue: "Missing required environment variable"

**Solution**: Ensure your `.env` file exists and contains all required variables.

```bash
# Verify .env file exists
ls -la .env

# Check it contains required variables
grep SKYFI_API_KEY .env
grep OPENAI_API_KEY .env
```

### Issue: "Database connection failed"

**Solution**: Verify `DATABASE_URL` or PostgreSQL settings.

```bash
# Test database connection
docker-compose exec postgres psql -U skyfi -d skyfi_mcp -c "SELECT 1;"
```

### Issue: "Invalid API key"

**Solution**: Verify the API key is correct and hasn't been revoked.

```bash
# Test SkyFi API key manually
curl -H "Authorization: Bearer $SKYFI_API_KEY" https://api.skyfi.com/v1/health
```

For more troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).

---

[← Back to Getting Started](getting-started.md) | [Next: Local Development →](local-development.md)
