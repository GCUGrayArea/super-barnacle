# Troubleshooting Guide

This guide covers common issues and their solutions when working with the SkyFi MCP server.

## Table of Contents

- [API Key Issues](#api-key-issues)
- [Database Connection Failures](#database-connection-failures)
- [TypeScript Compilation Errors](#typescript-compilation-errors)
- [Docker Build Failures](#docker-build-failures)
- [Health Check Failures](#health-check-failures)
- [SkyFi API Errors](#skyfi-api-errors)
- [OpenAI API Errors](#openai-api-errors)
- [Performance Issues](#performance-issues)
- [Network Issues](#network-issues)
- [Deployment Issues](#deployment-issues)
- [Debugging Checklist](#debugging-checklist)
- [Log Locations](#log-locations)
- [Getting Help](#getting-help)

## API Key Issues

### Error: "Missing required environment variable: SKYFI_API_KEY"

**Symptoms**:
```
[ERROR] Configuration validation failed
[ERROR] Missing required environment variable: SKYFI_API_KEY
```

**Causes**:
- `.env` file doesn't exist
- `.env` file is in wrong location
- Variable name is misspelled
- `.env` file not loaded properly

**Solutions**:

1. **Check `.env` file exists**:
   ```bash
   ls -la .env
   ```

2. **Verify content**:
   ```bash
   grep SKYFI_API_KEY .env
   ```

3. **Create from template if missing**:
   ```bash
   cp .env.example .env
   nano .env  # Add your actual API key
   ```

4. **Check file location**:
   ```bash
   # .env should be in project root
   pwd  # Should be /path/to/skyfi-mcp
   ls .env
   ```

5. **Verify spelling**:
   ```bash
   # Correct spelling
   SKYFI_API_KEY=your_key_here

   # Common mistakes
   SKYFI_APIKEY=...    # Wrong - missing underscore
   SKYFI_API_KEY =...  # Wrong - space before =
   ```

### Error: "Invalid API key" or "Unauthorized"

**Symptoms**:
```
[ERROR] SkyFi API error: 401 Unauthorized
[ERROR] Invalid API key provided
```

**Causes**:
- API key is incorrect
- API key has been revoked
- API key is for wrong environment (test vs. production)
- Extra whitespace in API key

**Solutions**:

1. **Verify API key format**:
   ```bash
   echo $SKYFI_API_KEY | wc -c  # Should be reasonable length
   echo $SKYFI_API_KEY | od -c  # Check for hidden characters
   ```

2. **Test API key directly**:
   ```bash
   curl -H "Authorization: Bearer $SKYFI_API_KEY" \
     https://api.skyfi.com/v1/health
   ```

3. **Get new API key**:
   - Log in to [skyfi.com](https://www.skyfi.com/)
   - Navigate to Developer Settings
   - Generate new API key
   - Update `.env` file

4. **Check for whitespace**:
   ```bash
   # Remove quotes and whitespace
   SKYFI_API_KEY=sk_live_abc123xyz  # Correct
   SKYFI_API_KEY="sk_live_abc123xyz"  # May cause issues
   SKYFI_API_KEY= sk_live_abc123xyz  # Wrong - space after =
   ```

### Error: "OpenAI API key invalid"

**Symptoms**:
```
[ERROR] OpenAI API error: 401 Unauthorized
[ERROR] Incorrect API key provided
```

**Solutions**:

1. **Verify API key**:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

2. **Check API key status**:
   - Log in to [platform.openai.com](https://platform.openai.com/)
   - Check API keys page
   - Verify key is active and not revoked

3. **Check billing**:
   - Ensure you have available credits
   - Verify payment method is valid
   - Check usage limits

4. **Regenerate key if needed**:
   - Create new API key
   - Update `.env` file
   - Restart server

## Database Connection Failures

### Error: "Database connection failed"

**Symptoms**:
```
[ERROR] Failed to connect to database
[ERROR] connect ECONNREFUSED 127.0.0.1:5432
```

**Causes**:
- PostgreSQL not running
- Wrong connection string
- Network issues
- PostgreSQL not accepting connections

**Solutions**:

1. **Check PostgreSQL is running**:
   ```bash
   docker-compose ps postgres
   # Should show "Up"
   ```

2. **Start PostgreSQL if needed**:
   ```bash
   docker-compose up -d postgres

   # Check logs
   docker-compose logs postgres
   ```

3. **Verify connection string**:
   ```bash
   # Format: postgresql://user:password@host:port/database
   echo $DATABASE_URL

   # With docker-compose, should be:
   # postgresql://skyfi:password@postgres:5432/skyfi_mcp
   # or if connecting from host:
   # postgresql://skyfi:password@localhost:5432/skyfi_mcp
   ```

4. **Test connection manually**:
   ```bash
   # From inside docker network
   docker-compose exec postgres psql -U skyfi -d skyfi_mcp -c "SELECT 1;"

   # From host
   psql -h localhost -U skyfi -d skyfi_mcp -c "SELECT 1;"
   ```

5. **Check PostgreSQL logs**:
   ```bash
   docker-compose logs postgres | tail -50
   ```

### Error: "relation does not exist"

**Symptoms**:
```
[ERROR] relation "cache" does not exist
```

**Causes**:
- Migrations haven't been run
- Wrong database selected
- Database was reset

**Solutions**:

1. **Run migrations**:
   ```bash
   npm run migrate:up
   ```

2. **Check migration status**:
   ```bash
   npm run migrate:status
   ```

3. **Verify database schema**:
   ```bash
   docker-compose exec postgres psql -U skyfi -d skyfi_mcp -c "\dt"
   ```

4. **Reset database if needed**:
   ```bash
   # Warning: This will delete all data
   docker-compose down -v
   docker-compose up -d postgres
   npm run migrate:up
   ```

### Error: "too many clients"

**Symptoms**:
```
[ERROR] too many clients already
```

**Causes**:
- Connection pool exhausted
- Connections not being released
- Too many concurrent requests

**Solutions**:

1. **Check active connections**:
   ```bash
   docker-compose exec postgres psql -U skyfi -d skyfi_mcp -c \
     "SELECT count(*) FROM pg_stat_activity WHERE datname = 'skyfi_mcp';"
   ```

2. **Kill idle connections**:
   ```bash
   docker-compose exec postgres psql -U skyfi -d skyfi_mcp -c \
     "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = 'skyfi_mcp' AND state = 'idle';"
   ```

3. **Increase connection limit** (in docker-compose.yml):
   ```yaml
   postgres:
     command: postgres -c max_connections=100
   ```

4. **Fix connection leaks in code**:
   - Ensure all database queries release connections
   - Use connection pooling properly
   - Review `src/db/client.ts`

## TypeScript Compilation Errors

### Error: "Cannot find module"

**Symptoms**:
```
[ERROR] Cannot find module '@modelcontextprotocol/sdk'
[ERROR] TS2307: Cannot find module or its corresponding type declarations
```

**Solutions**:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Clear node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check imports use .js extension**:
   ```typescript
   // Correct (ES modules require .js)
   import { logger } from './lib/logger.js';

   // Wrong
   import { logger } from './lib/logger';
   ```

### Error: "Type errors"

**Symptoms**:
```
[ERROR] Type 'string | undefined' is not assignable to type 'string'
```

**Solutions**:

1. **Fix type issues**:
   ```typescript
   // Before
   const apiKey = process.env['SKYFI_API_KEY'];

   // After
   const apiKey = process.env['SKYFI_API_KEY'] ?? '';
   // or
   const apiKey = process.env['SKYFI_API_KEY']!;
   ```

2. **Run type checker**:
   ```bash
   npm run typecheck
   ```

3. **Check tsconfig.json settings**:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true
     }
   }
   ```

## Docker Build Failures

### Error: "Docker build fails"

**Symptoms**:
```
[ERROR] failed to solve with frontend dockerfile.v0
[ERROR] executor failed running [...]: exit code 1
```

**Common Causes and Solutions**:

1. **npm install fails**:
   ```bash
   # Clear Docker cache
   docker builder prune

   # Rebuild without cache
   docker build --no-cache -t skyfi-mcp .
   ```

2. **TypeScript compilation fails**:
   ```bash
   # Fix TypeScript errors first
   npm run typecheck
   npm run build

   # Then rebuild Docker image
   docker build -t skyfi-mcp .
   ```

3. **Missing files**:
   ```bash
   # Check .dockerignore isn't excluding needed files
   cat .dockerignore

   # Verify files exist
   ls -la package.json tsconfig.json src/
   ```

4. **Network issues**:
   ```bash
   # Use different registry
   docker build --network=host -t skyfi-mcp .
   ```

### Error: "docker-compose up fails"

**Symptoms**:
```
[ERROR] Error response from daemon: [...] port is already allocated
```

**Solutions**:

1. **Port already in use**:
   ```bash
   # Find process using port 3000
   lsof -i :3000

   # Kill the process
   kill -9 PID

   # Or change port in docker-compose.yml
   ports:
     - "3001:3000"
   ```

2. **Volume permission issues**:
   ```bash
   # Fix permissions
   sudo chown -R $USER:$USER .

   # Remove volumes and restart
   docker-compose down -v
   docker-compose up
   ```

3. **Image not found**:
   ```bash
   # Rebuild images
   docker-compose build --no-cache
   docker-compose up
   ```

## Health Check Failures

### Error: "Health check failed"

**Symptoms**:
- Container marked as unhealthy
- Service not passing ALB health checks
- Tasks being replaced frequently

**Solutions**:

1. **Check health endpoint**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check logs for errors**:
   ```bash
   docker-compose logs mcp-server | tail -100
   ```

3. **Verify server is listening**:
   ```bash
   docker-compose exec mcp-server netstat -tuln | grep 3000
   ```

4. **Check health check configuration**:
   ```json
   {
     "interval": 30,      // Increase if needed
     "timeout": 10,       // Increase if slow startup
     "retries": 3,
     "startPeriod": 40    // Increase for slow startup
   }
   ```

5. **Test health check command**:
   ```bash
   docker-compose exec mcp-server node -e "require('http').get('http://localhost:3000/health', (res) => { console.log(res.statusCode); })"
   ```

## SkyFi API Errors

### Error: "Rate limit exceeded"

**Symptoms**:
```
[ERROR] SkyFi API error: 429 Too Many Requests
[ERROR] Rate limit exceeded. Try again later.
```

**Solutions**:

1. **Enable caching**:
   ```bash
   # In .env
   ENABLE_CACHE=true
   CACHE_TTL_HOURS=24
   ```

2. **Implement backoff**:
   ```typescript
   // Already implemented in src/lib/retry.ts
   // Exponential backoff with retries
   ```

3. **Reduce request frequency**:
   ```bash
   # Adjust rate limiting
   RATE_LIMIT_MAX_REQUESTS=50  # Lower limit
   ```

4. **Contact SkyFi support** to increase limits

### Error: "Invalid AOI format"

**Symptoms**:
```
[ERROR] Invalid WKT polygon format
[ERROR] AOI must be valid WKT POLYGON
```

**Solutions**:

1. **Validate WKT format**:
   ```typescript
   // Valid WKT POLYGON
   const aoi = 'POLYGON((-122.4 37.7, -122.4 37.8, -122.3 37.8, -122.3 37.7, -122.4 37.7))';

   // Must close the polygon (first and last points same)
   // Must be convex
   // Must not self-intersect
   ```

2. **Use online validator**:
   - [WKT Playground](https://arthur-e.github.io/Wicket/sandbox-gmaps3.html)

3. **Check coordinate order**:
   ```
   Format: POLYGON((lon lat, lon lat, ...))
   NOT: POLYGON((lat lon, lat lon, ...))
   ```

### Error: "Archive not found"

**Symptoms**:
```
[ERROR] Archive with ID xxx not found
```

**Solutions**:

1. **Verify archive ID is correct**
2. **Check archive hasn't been deleted**
3. **Search for archives first**:
   ```bash
   # Use search_archives tool to find valid archives
   ```

## OpenAI API Errors

### Error: "Insufficient quota"

**Symptoms**:
```
[ERROR] You exceeded your current quota, please check your plan and billing details
```

**Solutions**:

1. **Check usage and billing**:
   - Log in to [platform.openai.com](https://platform.openai.com/)
   - Go to Usage page
   - Add payment method or credits

2. **Set usage limits**:
   - Set up billing limits in OpenAI dashboard
   - Monitor usage regularly

3. **Optimize prompts**:
   - Reduce prompt length
   - Use cheaper models for testing
   - Cache responses when possible

### Error: "Model not found"

**Symptoms**:
```
[ERROR] The model gpt-4 does not exist
```

**Solutions**:

1. **Check model availability**:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

2. **Use available model**:
   ```typescript
   // In src/agent/config.ts
   model: 'gpt-4-turbo-preview'  // or 'gpt-3.5-turbo'
   ```

3. **Check API access**:
   - Some models require special access
   - Verify your account tier

## Performance Issues

### Issue: "Slow response times"

**Symptoms**:
- Requests take >5 seconds
- Timeouts occur frequently
- High latency

**Solutions**:

1. **Enable caching**:
   ```bash
   ENABLE_CACHE=true
   ```

2. **Check database query performance**:
   ```bash
   # Enable query logging
   docker-compose exec postgres psql -U skyfi -d skyfi_mcp -c \
     "ALTER DATABASE skyfi_mcp SET log_statement = 'all';"

   # Review slow queries
   docker-compose logs postgres | grep "duration:"
   ```

3. **Add database indexes**:
   ```sql
   CREATE INDEX idx_cache_key ON cache(key);
   CREATE INDEX idx_cache_expires ON cache(expires_at);
   ```

4. **Profile the application**:
   ```bash
   node --prof dist/index.js
   node --prof-process isolate-*.log > processed.txt
   ```

5. **Check network latency**:
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health
   ```

### Issue: "High memory usage"

**Symptoms**:
- Memory usage keeps increasing
- Out of memory errors
- Container restarts frequently

**Solutions**:

1. **Check for memory leaks**:
   ```bash
   node --inspect dist/index.js
   # Connect Chrome DevTools and take heap snapshots
   ```

2. **Increase container memory**:
   ```json
   // In ecs-task-definition.json
   {
     "memory": "2048"  // Increase from 1024
   }
   ```

3. **Review caching strategy**:
   ```bash
   # Reduce cache TTL
   CACHE_TTL_HOURS=6  # Instead of 24
   ```

4. **Monitor memory usage**:
   ```bash
   docker stats mcp-server
   ```

## Network Issues

### Error: "ECONNREFUSED"

**Symptoms**:
```
[ERROR] connect ECONNREFUSED 127.0.0.1:3000
```

**Solutions**:

1. **Check server is running**:
   ```bash
   docker-compose ps
   curl http://localhost:3000/health
   ```

2. **Check port mapping**:
   ```bash
   docker-compose ps  # Verify port mapping
   netstat -tuln | grep 3000
   ```

3. **Check firewall**:
   ```bash
   # Ensure port 3000 is not blocked
   sudo ufw status
   ```

### Error: "ETIMEDOUT"

**Symptoms**:
```
[ERROR] request to https://api.skyfi.com/v1/... failed, reason: connect ETIMEDOUT
```

**Solutions**:

1. **Check internet connection**:
   ```bash
   ping api.skyfi.com
   curl https://api.skyfi.com
   ```

2. **Check proxy settings**:
   ```bash
   echo $HTTP_PROXY
   echo $HTTPS_PROXY
   ```

3. **Increase timeout**:
   ```typescript
   // In src/skyfi/client.ts
   axios.defaults.timeout = 30000;  // 30 seconds
   ```

## Deployment Issues

### Error: "Task failed to start"

**Symptoms**:
- ECS tasks start then immediately stop
- "Essential container exited"

**Solutions**:

1. **Check CloudWatch logs**:
   ```bash
   aws logs tail /ecs/skyfi-mcp-server --follow
   ```

2. **Verify secrets exist**:
   ```bash
   aws secretsmanager list-secrets
   aws secretsmanager get-secret-value --secret-id skyfi-mcp/api-key
   ```

3. **Check IAM permissions**:
   - Execution role has `secretsmanager:GetSecretValue`
   - Task role has necessary permissions

4. **Verify image exists in ECR**:
   ```bash
   aws ecr describe-images --repository-name skyfi-mcp
   ```

### Error: "Health check failing in ECS"

**Solutions**:

1. **Increase start period**:
   ```json
   {
     "healthCheck": {
       "startPeriod": 60  // Give more time to start
     }
   }
   ```

2. **Check security group**:
   - Allow traffic on port 3000
   - Allow health check from ALB

3. **Verify container is listening**:
   ```bash
   # In task
   curl http://localhost:3000/health
   ```

## Debugging Checklist

When troubleshooting, work through this checklist:

### 1. Environment

- [ ] `.env` file exists and has all required variables
- [ ] API keys are valid and active
- [ ] Node.js version is 20.0.0 or higher
- [ ] Docker and docker-compose are installed

### 2. Dependencies

- [ ] `npm install` completed successfully
- [ ] No errors in `package-lock.json`
- [ ] `node_modules` directory exists

### 3. Database

- [ ] PostgreSQL container is running
- [ ] Database migrations have been run
- [ ] Can connect to database
- [ ] Tables exist (`\dt`)

### 4. Server

- [ ] Server starts without errors
- [ ] Listening on configured port
- [ ] Health endpoint returns 200
- [ ] Logs show no errors

### 5. Network

- [ ] Can curl localhost:3000/health
- [ ] Firewall not blocking port
- [ ] DNS resolving correctly
- [ ] No proxy interfering

### 6. Code

- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] No linting errors
- [ ] Code matches examples in docs

## Log Locations

### Local Development

```bash
# Console output
npm run dev

# File logs
cat logs/combined.log
cat logs/error.log

# Docker logs
docker-compose logs mcp-server
docker-compose logs postgres
```

### Production (ECS)

```bash
# CloudWatch Logs
aws logs tail /ecs/skyfi-mcp-server --follow

# Task logs
aws ecs describe-tasks --cluster skyfi-mcp-cluster --tasks TASK_ID

# Service events
aws ecs describe-services --cluster skyfi-mcp-cluster --services skyfi-mcp-server
```

### Log Levels

Set `LOG_LEVEL` for different verbosity:
- `error`: Errors only
- `warn`: Warnings and errors
- `info`: General information (production)
- `debug`: Detailed debugging (development)

## Getting Help

If you're still stuck after trying these solutions:

### 1. Check Documentation

- [Getting Started](getting-started.md)
- [Configuration Guide](configuration.md)
- [Local Development](local-development.md)
- [Deployment Guide](deployment.md)

### 2. Search Existing Issues

- [GitHub Issues](https://github.com/your-org/skyfi-mcp/issues)
- Search for error message
- Check closed issues too

### 3. Create Detailed Issue

Include:
- Error message (full stack trace)
- Steps to reproduce
- Environment details (OS, Node version, etc.)
- Relevant configuration (redact secrets)
- What you've tried

### 4. Community Support

- [GitHub Discussions](https://github.com/your-org/skyfi-mcp/discussions)
- Ask in MCP community channels
- Stack Overflow (tag: `model-context-protocol`)

### 5. Contact Support

- Email: support@skyfi.com
- Include:
  - Description of issue
  - Error logs
  - Steps taken
  - Urgency level

### Debug Information to Collect

When asking for help, provide:

```bash
# System information
node --version
npm --version
docker --version
docker-compose --version

# Package versions
npm list

# Environment (redact secrets)
env | grep -E "NODE_ENV|PORT|LOG_LEVEL|ENABLE_CACHE"

# Logs (last 50 lines)
docker-compose logs --tail=50 mcp-server

# Service status
docker-compose ps
curl http://localhost:3000/health
```

---

[← Back to Deployment](deployment.md) | [Back to README](../README.md)
