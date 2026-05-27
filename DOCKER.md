# Docker Setup Guide

This guide explains how to run the Fantasy Baseball App using Docker.

## Architecture

The application consists of 5 services:

1. **PostgreSQL** - Database (port 5432)
2. **Redis** - Cache/Session storage (port 6379)
3. **Backend** - NestJS API (port 3000)
4. **Frontend** - React SPA (port 3001)
5. **Nginx** - Reverse proxy (port 80)

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

### Development Mode (Local)

For local development, continue using:

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm install
npm start
```

### Production Mode (Docker)

1. **Build and start all services:**

```bash
docker-compose up --build
```

2. **Access the application:**
   - **Frontend**: http://localhost or http://localhost:3001
   - **Backend API**: http://localhost:3000/api
   - **API Docs**: http://localhost:3000/api/docs
   - **Through Nginx**: http://localhost/api

3. **Stop all services:**

```bash
docker-compose down
```

4. **Stop and remove volumes (clean slate):**

```bash
docker-compose down -v
```

## Environment Variables

### Backend Environment

Set these in `.env` or in `docker-compose.yml`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/fantasy_baseball
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:3001,http://localhost
PORT=3000
```

### Frontend Environment

```env
REACT_APP_API_URL=http://localhost/api
```

## Service Details

### Backend (NestJS)

**Dockerfile**: `backend/Dockerfile`
- Multi-stage build (builder + production)
- Node 20 Alpine
- Non-root user (nestjs:1001)
- Health check on `/api`
- Optimized with dumb-init for signal handling

**Build:**
```bash
cd backend
docker build -t fantasy-baseball-backend .
```

### Frontend (React)

**Dockerfile**: `frontend/Dockerfile`
- Multi-stage build (builder + nginx)
- Node 20 Alpine for build
- Nginx 1.25 Alpine for serving
- Non-root user (nginx-user:1001)
- Health check on `/`
- Static asset caching

**Build:**
```bash
cd frontend
docker build -t fantasy-baseball-frontend .
```

### Nginx Reverse Proxy

**Config**: `infrastructure/nginx.conf`
- Routes `/api/*` to backend:3000
- Routes `/*` to frontend:8080
- Security headers
- Gzip compression

## Database Migrations

Run migrations inside the backend container:

```bash
# One-time migration
docker-compose exec backend npx prisma migrate deploy

# Generate Prisma client (if needed)
docker-compose exec backend npx prisma generate

# Seed database (if seed script exists)
docker-compose exec backend npx prisma db seed
```

## Logs

View logs for all services:
```bash
docker-compose logs -f
```

View logs for specific service:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Troubleshooting

### Backend won't start

1. Check if database is healthy:
```bash
docker-compose ps
docker-compose logs postgres
```

2. Verify environment variables:
```bash
docker-compose exec backend env | grep DATABASE_URL
```

3. Check Prisma client generation:
```bash
docker-compose exec backend ls -la node_modules/.prisma
```

### Frontend shows "Cannot connect to API"

1. Check backend health:
```bash
curl http://localhost:3000/api
```

2. Check nginx routing:
```bash
curl http://localhost/api
```

3. Verify CORS settings in backend environment

### Port conflicts

If ports 80, 3000, 3001, 5432, or 6379 are already in use:

1. Stop conflicting services
2. Or modify `docker-compose.yml` to use different ports:
```yaml
ports:
  - "8080:80"  # Change host port
```

## Security Notes

### Production Deployment

Before deploying to production:

1. **Change default passwords:**
   - PostgreSQL credentials
   - JWT_SECRET

2. **Use environment file:**
```bash
cp .env.example .env
# Edit .env with production values
docker-compose --env-file .env up
```

3. **Enable HTTPS:**
   - Update nginx.conf with SSL certificates
   - Use Let's Encrypt for free certificates

4. **Restrict network access:**
   - Remove unnecessary port mappings
   - Use Docker networks for service-to-service communication

## Performance Tuning

### PostgreSQL

Add to `docker-compose.yml`:
```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
```

### Redis

Add to `docker-compose.yml`:
```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

## Development Tips

### Watch mode for backend

For development with hot reload:
```yaml
backend:
  command: npm run start:dev
  volumes:
    - ./backend/src:/app/src
```

### Frontend with hot reload

For development with hot reload:
```yaml
frontend:
  command: npm start
  volumes:
    - ./frontend/src:/app/src
```

## Health Checks

All services include health checks:

```bash
# Check all service health
docker-compose ps

# Manual health check
curl http://localhost:3000/api
curl http://localhost:3001/health
```

## Backup and Restore

### Backup Database

```bash
docker-compose exec postgres pg_dump -U postgres fantasy_baseball > backup.sql
```

### Restore Database

```bash
docker-compose exec -T postgres psql -U postgres fantasy_baseball < backup.sql
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Docker Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build images
        run: docker-compose build
      - name: Run tests
        run: docker-compose run backend npm test
```

## Useful Commands

```bash
# Rebuild specific service
docker-compose up --build backend

# Scale a service
docker-compose up --scale backend=3

# Execute command in container
docker-compose exec backend npm run prisma:studio

# Remove all containers and images
docker-compose down --rmi all

# View resource usage
docker stats
```
